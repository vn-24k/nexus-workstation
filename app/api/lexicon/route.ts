import { NextRequest, NextResponse } from "next/server";
import lexiconData from "@/lib/lexicon_data.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase().trim();
    const domain = searchParams.get("domain")?.trim();
    const category = searchParams.get("category")?.trim();

    if (!q && !domain && !category) {
      return NextResponse.json({
        ok: true,
        version: lexiconData.version,
        totalTerms: lexiconData.totalTerms,
        domains: lexiconData.domains,
        transformations: lexiconData.transformations,
        quickPresets: lexiconData.quickPresets,
      });
    }

    // Filter results
    let filteredDomains = lexiconData.domains;

    if (domain) {
      filteredDomains = filteredDomains.filter((d) => d.id === domain);
    }

    if (category) {
      filteredDomains = filteredDomains.map((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id === category || c.title.toLowerCase().includes(category.toLowerCase())),
      }));
    }

    if (q) {
      filteredDomains = filteredDomains.map((d) => ({
        ...d,
        categories: d.categories
          .map((c) => ({
            ...c,
            items: c.items.filter(
              (item) =>
                item.term.toLowerCase().includes(q) ||
                item.meaning.toLowerCase().includes(q) ||
                item.example.toLowerCase().includes(q)
            ),
          }))
          .filter((c) => c.items.length > 0),
      }));
    }

    const totalFiltered = filteredDomains.reduce(
      (acc, d) => acc + d.categories.reduce((cAcc, c) => cAcc + c.items.length, 0),
      0
    );

    return NextResponse.json({
      ok: true,
      totalTerms: totalFiltered,
      domains: filteredDomains,
      transformations: lexiconData.transformations,
      quickPresets: lexiconData.quickPresets,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
