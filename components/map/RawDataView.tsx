"use client";

import { useMemo } from "react";
import { diffJson } from "diff";
import { Button } from "@/components/ui/button";
import { RefreshCw, RotateCcw } from "lucide-react";

interface RawDataViewProps {
  currentData: object;
  initialData: object;
  onRefresh?: () => void;
  onReset?: () => void;
}

export function RawDataView({ currentData, initialData, onRefresh, onReset }: RawDataViewProps) {
  const diff = useMemo(() => {
    return diffJson(initialData, currentData);
  }, [currentData, initialData]);

  const hasChanges = diff.some((part) => part.added || part.removed);

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {(onRefresh || onReset) && (
        <div className="flex gap-2 justify-end">
          {onReset && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="text-red-600 hover:text-red-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Changes
            </Button>
          )}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh from DB
            </Button>
          )}
        </div>
      )}

      {/* Diff Display */}
      <div className="p-4 bg-muted rounded-lg text-sm font-mono">
        {!hasChanges ? (
          <div>
            <p className="font-sans text-muted-foreground mb-2">
              No changes detected. Showing current saved data.
            </p>
            <pre>{JSON.stringify(currentData, null, 2)}</pre>
          </div>
        ) : (
          <div>
            <p className="font-sans text-muted-foreground mb-2">
              <span className="text-green-600">+ Added</span> | <span className="text-red-600">- Removed</span> | <span className="text-muted-foreground">Unchanged</span>
            </p>
            <pre>
              {diff.map((part, index) => {
                const color = part.added
                  ? "text-green-500"
                  : part.removed
                    ? "text-red-500"
                    : "text-muted-foreground";
                const prefix = part.added ? "+ " : part.removed ? "- " : "  ";

                const lines = part.value.split("\n").map((line, i, arr) => {
                  if (i === arr.length - 1 && line === "") return null;
                  return (
                    <span key={i}>
                      {prefix}
                      {line}
                      {"\n"}
                    </span>
                  );
                });

                return (
                  <span key={index} className={color}>
                    {lines}
                  </span>
                );
              })}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
