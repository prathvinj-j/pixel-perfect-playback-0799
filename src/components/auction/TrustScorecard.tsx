import { ShieldCheck, Lock, Clock, Award, CheckCircle2 } from "lucide-react";

export function TrustScorecard({
  minIncrement,
  startingPrice,
}: {
  minIncrement: number;
  startingPrice: number;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Transparency & Fair-Play Guarantee</h3>
          <p className="text-xs text-muted-foreground">Certified server-enforced auction rules</p>
        </div>
      </div>

      <div className="grid gap-2.5 text-xs text-muted-foreground pt-1">
        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-2.5">
          <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">100% Reserve-Free:</strong> No hidden seller reserves. The highest verified offer when the clock strikes zero wins.
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-2.5">
          <Lock className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Row-Locked Concurrency:</strong> Every bid acquires an exclusive PostgreSQL database lock (`FOR UPDATE`), making double-bidding or race conditions mathematically impossible.
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-2.5">
          <Clock className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Server-Clock Verification:</strong> Deadlines and timestamps are validated strictly on server time (`clock_timestamp()`), protecting human bidders from device clock tampering.
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-2.5">
          <Award className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Strict Increment Ladder:</strong> Each counter-offer must exceed the standing high bid by at least <strong>${minIncrement.toFixed(2)}</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
