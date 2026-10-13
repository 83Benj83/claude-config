import { getCurrentMember } from "@/lib/auth/session";
import { monthReportToCsv } from "@/lib/csv";
import { getRepository } from "@/lib/data";
import { endOfMonth, isMonthKey, monthKeyOf, startOfMonth, todayIso } from "@/lib/dates";
import { buildMonthReport } from "@/lib/stats";

/** Téléchargement du bilan mensuel au format CSV (réservé aux membres connectés). */
export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) return new Response("Non autorisé", { status: 401 });

  const requested = new URL(request.url).searchParams.get("mois");
  const month = isMonthKey(requested) ? requested : monthKeyOf(todayIso());

  const repository = await getRepository();
  const [members, entries] = await Promise.all([
    repository.listMembers(),
    repository.listEntries({ from: startOfMonth(month), to: endOfMonth(month) }),
  ]);
  const csv = monthReportToCsv(buildMonthReport(members, entries, month));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bilan-prospection-${month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
