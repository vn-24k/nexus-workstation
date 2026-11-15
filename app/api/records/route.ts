import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("q") || undefined;

    const records = db.getRecords(category, search);
    return NextResponse.json({
      success: true,
      total: records.length,
      data: records,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao consultar registros." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, content, status, metadata } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Título e conteúdo são obrigatórios." },
        { status: 400 }
      );
    }

    const newRecord = db.addRecord({
      title,
      category: category || "sistema",
      content,
      status: status || "processado",
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      message: "Registro gravado com sucesso no banco de dados.",
      data: newRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao gravar registro." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do registro não informado." },
        { status: 400 }
      );
    }

    const deleted = db.deleteRecord(id);
    return NextResponse.json({
      success: deleted,
      message: deleted ? "Registro removido com sucesso." : "Registro não encontrado.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao deletar registro." },
      { status: 500 }
    );
  }
}
