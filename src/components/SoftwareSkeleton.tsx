import React from "react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

export const SoftwareSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </CardHeader>
      <CardContent className="flex-grow">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-2" />
      </CardContent>
      <CardFooter className="py-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
};
