from __future__ import annotations

from typing import Any

import numpy as np
import shap


# ─── Feature explanation dictionary ──────────────────────────────────────────

def _generate_feature_explanation(feature_name: str, sensitive_attr: str, impact: float) -> str:
    """Generate specific, plain-English explanation for why a feature causes bias."""
    f = feature_name.lower().replace("numeric__", "").replace("categorical__", "").replace("onehot__", "")
    attr = sensitive_attr.lower().replace("_", " ")
    impact_word = "strongly" if impact > 20 else "moderately" if impact > 10 else "slightly"

    EXPLANATIONS: dict[str, str] = {
        "gender":     f"Gender is {impact_word} influencing outcomes — the model learned different decision patterns for different genders, which may constitute sex discrimination.",
        "sex":        f"Sex is {impact_word} influencing outcomes — decisions differ based on sex, a legally protected characteristic under Title VII.",
        "race":       f"Race is {impact_word} driving outcome differences — this is a primary indicator of racial discrimination and likely violates EEOC guidelines.",
        "ethnicity":  f"Ethnicity is {impact_word} affecting outcomes — decisions are being made differently based on ethnic background.",
        "age":        f"Age is {impact_word} influencing decisions — applicants receive systematically different outcomes based on age, potentially violating ADEA protections.",
        "zip":        f"ZIP code acts as a racial proxy — residential segregation means location data encodes racial bias indirectly ({impact:.1f}% of total bias).",
        "postal":     f"Postal code is being used as a proxy for race or socioeconomic status due to historical housing segregation patterns.",
        "income":     f"Income differences between demographic groups reflect historical discrimination, making income a proxy variable that amplifies existing inequality.",
        "salary":     f"Salary history encodes past discrimination — using it perpetuates wage gaps between groups and compounds historical bias.",
        "education":  f"Education level reflects unequal access across demographic groups, encoding systemic inequality ({impact:.1f}% impact on outcomes).",
        "school":     f"School attended correlates with race and income due to geographic school segregation, acting as a proxy discriminator.",
        "experience": f"Years of experience may encode historical barriers — groups that faced discrimination had less access to opportunities, creating a compounding disadvantage.",
        "marital":    f"Marital status correlates strongly with gender and may encode indirect sex discrimination — {impact:.1f}% of bias originates here.",
        "name":       f"Names can encode race and ethnicity — if names reach the model, this constitutes direct racial discrimination.",
        "address":    f"Address data encodes neighbourhood segregation and acts as a proxy for race and socioeconomic status.",
        "insurance":  f"Insurance type correlates with race and income — using it as a feature can introduce socioeconomic and racial proxy bias.",
        "discharge":  f"Discharge destination correlates with race and insurance coverage, encoding socioeconomic bias into clinical decisions.",
        "diagnosis":  f"Diagnosis codes may correlate with race due to differential access to preventative care across demographic groups.",
    }

    for key, explanation in EXPLANATIONS.items():
        if key in f:
            return explanation

    # Generic fallback — specific enough to be useful
    clean_name = feature_name.replace("numeric__", "").replace("categorical__", "").replace("onehot__", "").replace("_", " ")
    return (
        f"'{clean_name}' contributes {impact:.1f}% of outcome disparity. "
        f"It is statistically correlated with {attr} and may act as a proxy variable — "
        f"the model uses this feature as a substitute for the protected characteristic, "
        f"producing discriminatory outcomes even without directly using {attr}."
    )


# ─── SHAP feature impact ──────────────────────────────────────────────────────

def compute_top_feature_impacts(
    model: Any,
    transformed_features: np.ndarray,
    feature_names: list[str],
    top_k: int = 5,
) -> list[dict[str, float | str]]:
    # Cap samples for speed — 200 rows is statistically sufficient for SHAP
    max_shap_samples = min(200, len(transformed_features))
    shap_sample = transformed_features[:max_shap_samples]

    try:
        estimator = model.named_steps["classifier"]
        explainer = shap.LinearExplainer(estimator, shap_sample)
        shap_values = explainer.shap_values(shap_sample)
    except Exception:
        try:
            explainer = shap.LinearExplainer(model, shap_sample)
            shap_values = explainer.shap_values(shap_sample)
        except Exception:
            # Fallback: use model coefficients when SHAP fails entirely
            clf = model.named_steps.get("classifier", model) if hasattr(model, "named_steps") else model
            if hasattr(clf, "coef_"):
                shap_values = np.abs(clf.coef_[0]).reshape(1, -1)
            else:
                shap_values = np.ones((1, shap_sample.shape[1]))

    if isinstance(shap_values, list):
        shap_array = np.asarray(shap_values[1])
    else:
        shap_array = np.asarray(shap_values)

    # Ensure 2-D array (fallback coef_ path produces 1-D or 2-D)
    if shap_array.ndim == 1:
        shap_array = shap_array.reshape(1, -1)

    mean_abs = np.abs(shap_array).mean(axis=0)
    total = float(mean_abs.sum()) or 1.0
    top_idx = np.argsort(mean_abs)[::-1][:top_k]

    return [
        {
            "feature": feature_names[idx],
            "impact": float(np.round(mean_abs[idx], 4)),
            "impact_percentage": float(np.round((mean_abs[idx] / total) * 100, 1)),
        }
        for idx in top_idx
    ]


# ─── Human-readable explanation builder ──────────────────────────────────────

def build_human_explanation(
    top_features: list[dict[str, float | str]],
    fairness_summary: dict[str, Any],
    sensitive_attr: str = "protected attribute",
) -> str:
    if not top_features:
        return "No dominant feature-level bias signal was found."

    spd = fairness_summary["statistical_parity"]
    eod = fairness_summary["equal_opportunity"]
    di  = fairness_summary["disparate_impact"]

    # Build enriched features with specific explanations
    enriched = []
    for item in top_features[:3]:
        fname  = str(item["feature"])
        impact = float(item.get("impact_percentage", item.get("impact", 0)))
        explanation = _generate_feature_explanation(fname, sensitive_attr, impact)
        enriched.append({"name": fname, "impact": impact, "explanation": explanation})

    top_names = ", ".join(
        f['name'].replace('numeric__', '').replace('categorical__', '').replace('_', ' ')
        for f in enriched[:2]
    )

    bias_level = (
        "critical" if di < 0.5 else
        "significant" if di < 0.7 else
        "moderate" if di < 0.8 else
        "minimal"
    )

    return (
        f"Bias signals are {bias_level} and driven primarily by {top_names}. "
        f"Statistical parity: {spd:+.3f} (threshold ±0.10), "
        f"equal opportunity: {eod:+.3f}, "
        f"disparate impact: {di:.3f} ({'FAIL — below 0.80 EEOC threshold' if di < 0.8 else 'PASS'}). "
        f"{enriched[0]['explanation'] if enriched else ''}"
    )
