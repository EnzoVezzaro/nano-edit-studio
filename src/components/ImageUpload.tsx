import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Image, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUpload: (files: File[]) => void;
}

export const ImageUpload = ({ onImageUpload }: ImageUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length > 0) {
      onImageUpload(imageFiles);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.bmp', '.tiff']
    },
    multiple: true,
    maxFiles: 5
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-primary">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Welcome to PhotoBanana
        </h2>
        <p className="text-muted-foreground text-lg">
          AI-powered photo editing with Nano Banana
        </p>
      </div>

      <Card
        {...getRootProps()}
        className={cn(
          "p-12 border-2 border-dashed cursor-pointer transition-all duration-300",
          "hover:border-primary/50 hover:bg-gradient-surface",
          "group relative overflow-hidden",
          isDragActive && "border-primary bg-primary/5 scale-[1.02]"
        )}
      >
        <input {...getInputProps()} />
        
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
        
        <div className="relative text-center">
          <div className={cn(
            "w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30",
            "flex items-center justify-center mx-auto mb-6 transition-all duration-300",
            "group-hover:border-primary/50 group-hover:scale-110",
            isDragActive && "border-primary scale-110"
          )}>
            {isDragActive ? (
              <Upload className="w-8 h-8 text-primary animate-bounce" />
            ) : (
              <Image className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold mb-2">
            {isDragActive ? "Drop your images here" : "Upload your photos"}
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Drag & drop up to 5 images, or click to browse
          </p>
          
          <Button 
            variant="default" 
            size="lg"
            className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
          >
            <Upload className="w-5 h-5 mr-2" />
            Choose Images
          </Button>
          
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Supports:</span>
            <div className="flex gap-2">
              {["JPG", "PNG", "WebP", "TIFF"].map((format) => (
                <span 
                  key={format}
                  className="px-2 py-1 bg-muted rounded text-xs font-medium"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Your images are processed locally and securely.{" "}
          <span className="text-primary font-medium">Privacy guaranteed.</span>
        </p>
      </div>
    </div>
  );
};