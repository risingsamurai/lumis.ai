import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function Settings() {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="mt-2 text-white/70">Notification preferences and account metadata.</p>
      </Card>
      <Card>
        <h2 className="text-xl font-bold">API Key Management</h2>
        <input
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-white"
          placeholder="Enterprise integration API key"
        />
        <Button className="mt-3">Save Key</Button>
      </Card>
      <Card>
        <h2 className="text-xl font-bold">Team Invites</h2>
        <input
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-white"
          placeholder="teammate@company.com"
        />
        <Button className="mt-3">Send Invite</Button>
      </Card>
    </div>
  );
}
