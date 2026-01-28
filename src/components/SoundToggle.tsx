import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SoundToggle() {
  const { soundEnabled, toggleSound } = useSound();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSound}
            className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{soundEnabled ? "Mute sounds" : "Enable UI sounds"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
