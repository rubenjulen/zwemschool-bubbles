// Centraal beheerde teksten (NFR-9). MVP = uitsluitend Nederlands; deze
// structuur is voorbereid op latere meertaligheid zonder code-wijzigingen
// in componenten.
export const nl = {
  app: {
    name: "Zwemschool Bubbles",
    tagline: "Veilig en eenvoudig zwemles regelen.",
  },
  status: {
    online: "Online",
    offline: "Offline - wijzigingen worden bewaard en later gesynchroniseerd",
    syncing: "Synchroniseren...",
    synced: "Bijgewerkt",
    syncFailed: "Synchronisatie mislukt - wordt opnieuw geprobeerd",
    staleData: "Mogelijk verouderd door offline gebruik",
  },
  roles: {
    guardian: "Ouder / verzorger",
    instructor: "Instructeur",
    lead_instructor: "Hoofdinstructeur",
    admin: "Beheer / kantoor",
    finance_admin: "Financieel beheer",
    system_admin: "Systeembeheer",
  },
  weather: {
    title: "Weer bij het bad",
    loading: "Weer laden...",
    unavailable: "Weer momenteel niet beschikbaar",
    rainWarning: "Let op: kans op (onweers)buien",
    next24h: "Komende 24 uur",
  },
  common: {
    loading: "Laden...",
    save: "Opslaan",
    cancel: "Annuleren",
    retry: "Opnieuw proberen",
  },
} as const;

export type Dictionary = typeof nl;
