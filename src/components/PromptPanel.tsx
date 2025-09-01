import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import posthog from "posthog-js";
import {
  Sparkles,
  Wand2,
  Palette,
  Scissors,
  Layers,
  RotateCcw
} from "lucide-react";

interface PromptPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onRunEdit: () => void;
  isProcessing: boolean;
}

const presets = [
  { 
    id: "remove", 
    label: "Remove Object", 
    icon: Scissors,
    prompt: "Remove the selected object and fill the background naturally"
  },
  { 
    id: "recolor", 
    label: "Recolor", 
    icon: Palette,
    prompt: "Change the color of the selected area to "
  },
  { 
    id: "style", 
    label: "Style Transfer", 
    icon: Wand2,
    prompt: "Apply the artistic style from the reference image while preserving the subject"
  },
  { 
    id: "background", 
    label: "Background", 
    icon: Layers,
    prompt: "Replace the background with "
  },
];

export const PromptPanel = ({
  prompt,
  onPromptChange,
  onRunEdit,
  isProcessing
}: PromptPanelProps) => {
  const handlePresetClick = (presetPrompt: string) => {
    onPromptChange(presetPrompt);
  };

  const handleRunEdit = () => {
    posthog.capture('run_edit');
    onRunEdit();
  };

  return (
    <Card className="border-0 rounded-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Prompt
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Nano Banana
          </Badge>
          <Badge variant="outline" className="text-xs">
            Gemini 2.5 Flash
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Presets */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 flex flex-col items-center gap-2 text-xs"
                  onClick={() => handlePresetClick(preset.prompt)}
                >
                  <Icon className="w-4 h-4" />
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>
        
        <Separator />
        
        {/* Custom Prompt */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Custom Edit</h4>
          <Textarea
            placeholder="Describe the edit you want to make... (e.g., 'Change the sky to sunset colors', 'Remove the person in red shirt', 'Make it look like a painting')"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-24 resize-none"
            disabled={isProcessing}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleRunEdit}
            disabled={!prompt.trim() || isProcessing}
            className="w-full bg-gradient-primary hover:shadow-primary transition-all duration-300"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Edit
              </>
            )}
          </Button>
          
          {prompt && !isProcessing && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onPromptChange("")}
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Clear Prompt
            </Button>
          )}
        </div>
        
        {/* Tips */}
        <div className="mt-6 p-3 bg-gradient-surface rounded-lg border border-border/50">
          <h5 className="text-xs font-medium mb-2 text-primary">💡 Pro Tips</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Be specific about what you want to change</li>
            <li>• Use selection tools to target specific areas</li>
            <li>• Reference colors, styles, or textures for better results</li>
          </ul>
        </div>

        {/* AdSense Square Ad */}
        <div className="mt-4 text-center">
          <div className="adsense-container">
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '250px', height: '250px' }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="square"
              data-full-width-responsive="false"
            ></ins>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
