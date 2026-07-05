import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-ink-500">
      <p>© PRO ALI SMART · ISO 실행력 무료진단</p>
      <p className="mt-1">
        <Link href="/privacy" className="text-brand-600 hover:underline">
          개인정보처리방침
        </Link>
      </p>
    </footer>
  );
}
