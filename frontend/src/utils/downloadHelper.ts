/**
 * Download utility functions for exporting data
 */

/**
 * Downloads a CSV file from a CSV string content
 * @param csvContent - The CSV string content
 * @param fileName - The name of the file to download (default: "dataset.csv")
 */
export function downloadCSV(csvContent: string, fileName: string = "dataset.csv"): void {
  try {
    // Create a Blob with type text/csv
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    // Generate a temporary URL
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download CSV:", error);
    throw new Error("Failed to download CSV file");
  }
}

/**
 * Downloads a JSON file from an object
 * @param data - The data object to download
 * @param fileName - The name of the file to download (default: "data.json")
 */
export function downloadJSON(data: unknown, fileName: string = "data.json"): void {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download JSON:", error);
    throw new Error("Failed to download JSON file");
  }
}
