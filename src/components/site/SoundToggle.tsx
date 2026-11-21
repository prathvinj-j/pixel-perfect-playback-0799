import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSoundEnabled, setSoundEnabled, playBidChime } from "@/lib/sound-effects";
import { toast } from "sonner";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      playBidChime();
      toast.info("Auction audio enabled", { description: "Gavel strikes and live bid chimes are active." });
    } else {
      toast.info("Auction audio muted");
    }
  };

  return (
    <Button
      variant="stage-ghost"
      size="icon"
      onClick={toggle}
      className="size-9 rounded-full text-navy-muted hover:text-navy-foreground"
      aria-label={enabled ? "Mute auction sound effects" : "Enable auction sound effects"}
      title={enabled ? "Sound effects: ON (Click to mute)" : "Sound effects: MUTED (Click to enable)"}
    >
      {enabled ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 opacity-60" />}
    </Button>
  );
}
