import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <p className="text-xl font-semibold">Page not found</p>
      <Button onClick={() => navigate("/dashboard")} variant="outline" className="rounded-xl">
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;