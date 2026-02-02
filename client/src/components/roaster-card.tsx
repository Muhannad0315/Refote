import { MapPin, Star, Coffee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Roaster } from "@shared/schema";
import { Link } from "wouter";

interface RoasterCardProps {
  roaster: Roaster;
  averageRating?: number;
  totalCheckIns?: number;
}

export function RoasterCard({ roaster, averageRating = 0, totalCheckIns = 0 }: RoasterCardProps) {
  return (
    <Card className="overflow-hidden border-card-border group" data-testid={`card-roaster-${roaster.id}`}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        {roaster.imageUrl ? (
          <img
            src={roaster.imageUrl}
            alt={roaster.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Coffee className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-xl font-medium text-white mb-1" data-testid={`text-roaster-name-${roaster.id}`}>
            {roaster.name}
          </h3>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <MapPin className="h-4 w-4" />
            <span>{roaster.location}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{averageRating.toFixed(1)}</span>
            </div>
            <div className="text-muted-foreground">
              {totalCheckIns} check-ins
            </div>
          </div>
          
          {roaster.specialty && (
            <Badge variant="secondary" className="text-xs">
              {roaster.specialty}
            </Badge>
          )}
        </div>

        <Link href={`/check-in?roasterId=${roaster.id}`}>
          <Button className="w-full" data-testid={`button-checkin-roaster-${roaster.id}`}>
            Check In Here
          </Button>
        </Link>
      </div>
    </Card>
  );
}
