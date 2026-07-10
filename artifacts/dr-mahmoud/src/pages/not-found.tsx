import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" dir="rtl">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex mb-4 gap-2 items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">٤٠٤ — الصفحة غير موجودة</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
          </p>

          <Link href="/">
            <Button className="mt-6">العودة إلى الصفحة الرئيسية</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
