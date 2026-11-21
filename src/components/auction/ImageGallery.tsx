import { useState } from "react";
import { Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const current = images[i] ?? images[0];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl border bg-card shadow-card sm:aspect-[5/4]">
        {current ? (
          <img src={current} alt={alt} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground"><Gavel className="size-14" /></div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, idx) => (
            <button
              key={src}
              onClick={() => setI(idx)}
              aria-label={`Show photo ${idx + 1}`}
              className={cn(
                "size-20 shrink-0 overflow-hidden rounded-xl border-2 transition",
                idx === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
