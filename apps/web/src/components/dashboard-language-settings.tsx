"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { updateUserLanguageSettings } from "@/actions/learning-actions";
import type { LanguageModuleSnapshot } from "@/lib/learning/aggregate";

type Props = {
  rows: LanguageModuleSnapshot[];
};

export function DashboardLanguageSettings({ rows }: Props) {
  const router = useRouter();
  const [pendingByCode, setPendingByCode] = useState<Record<string, boolean>>({});

  const patch = useCallback(
    (code: string, patchPayload: Parameters<typeof updateUserLanguageSettings>[1]) => {
      void (async () => {
        setPendingByCode((p) => ({ ...p, [code]: true }));
        try {
          await updateUserLanguageSettings(code, patchPayload);
          router.refresh();
        } catch (e) {
          console.error(e);
        } finally {
          setPendingByCode((p) => ({ ...p, [code]: false }));
        }
      })();
    },
    [router],
  );

  return (
    <section className="card dashboard-lang-settings" aria-labelledby="lang-settings-heading">
      <h2 id="lang-settings-heading" className="dashboard-section-title">
        Pengaturan bahasa
      </h2>
      <p className="text-muted dashboard-settings-intro">
        Centang bahasa yang sedang dipelajari dan mana yang ikut menghitung ringkasan progress total gabungan.
        Progress per karakter tidak dihapus saat Anda menghapus centang total gabungan.
      </p>
      <div className="dashboard-lang-settings-rows">
        {rows.map((row) => {
          const pending = pendingByCode[row.languageCode] === true;
          return (
            <div
              key={row.languageId}
              className="dashboard-lang-setting-row"
              data-testid={`dashboard-lang-settings-${row.languageCode}`}
            >
              <div className="dashboard-lang-setting-label">
                <strong>{row.flagLabel}</strong>
                <span className="text-muted">{row.nativeName}</span>
              </div>
              <label className="dashboard-lang-checkbox">
                <input
                  type="checkbox"
                  checked={row.isStudying}
                  disabled={pending}
                  data-testid={`dashboard-studying-${row.languageCode}`}
                  onChange={(e) => patch(row.languageCode, { isStudying: e.target.checked })}
                />
                Sedang dipelajari
              </label>
              <label className="dashboard-lang-checkbox">
                <input
                  type="checkbox"
                  checked={row.includeInTotalProgress}
                  disabled={pending}
                  data-testid={`dashboard-include-total-${row.languageCode}`}
                  onChange={(e) =>
                    patch(row.languageCode, { includeInTotalProgress: e.target.checked })
                  }
                />
                Masuk progress total gabungan
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
