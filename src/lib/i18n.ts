// =============================================================================
// English / French
//
// Every piece of student-facing text lives here, once in English (`en`) and
// once in French (`fr`). TypeScript checks that the French list has every
// entry the English one has, so nothing can be forgotten.
//
// The visitor's choice is saved in the "lang" cookie (see the FR / EN switch).
// Without a choice, we use the phone's language.
//
// Event titles and descriptions stay exactly as the clubs wrote them.
// =============================================================================

export type Locale = "en" | "fr";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

// The code browsers and Intl use for dates and money ("en-CA" / "fr-CA").
export const intlLocale = (l: Locale) => (l === "fr" ? "fr-CA" : "en-CA");

const en = {
  site: {
    tagline:
      "Coucou! Every club meetup, talk and party on campus — in one place.",
    privacy: "Privacy",
    switchTo: "Français", // the switch shows the OTHER language
    switchShort: "FR",
    switchLabel: "Afficher le site en français",
    independent:
      "Kuku is an independent student project, not affiliated with any school.",
  },
  nav: {
    events: "Events",
    search: "Search",
    post: "Post",
    myEvents: "My events",
    main: "Main",
  },
  header: {
    allEvents: "All events",
    changeSchool: "Change school",
    logIn: "Log in",
    myEvents: "My events",
    searchSchool: (school: string) => `Search ${school} events`,
    hosting: "Hosting an event?",
    submitIt: "Submit it to be listed here →",
  },
  picker: {
    choose: "Choose your school",
    loadError: "Couldn't load schools. Please try again in a minute.",
    current: "Current",
  },
  filters: {
    label: "Filter events",
    categoriesLabel: "Categories",
    today: "Today",
    thisWeek: "This week",
    free: "Free",
    clear: "Clear",
  },
  categories: {
    party: "🎉 Party",
    social: "👋 Social",
    sports: "⚽ Sports",
    arts: "🎨 Arts",
    cultural: "🌏 Cultural",
    academic: "📚 Academic",
    career: "💼 Career",
    other: "✨ Other",
  } as Record<string, string>,
  categoryNames: {
    party: "Party",
    social: "Social",
    sports: "Sports",
    arts: "Arts",
    cultural: "Cultural",
    academic: "Academic",
    career: "Career",
    other: "Other",
  } as Record<string, string>,
  campuses: {} as Record<string, string>, // "Off-campus", "Online" stay as is
  feed: {
    loadErrorTitle: "Couldn't load events",
    loadErrorBody:
      "Something went wrong on our end. Please try again in a minute.",
    noneTitle: "No upcoming events yet",
    noneBody: "New events are on the way — check back soon!",
    noMatchSearch: (q: string) => `No events match “${q}”`,
    noMatch: "Nothing matches these filters",
    tryAnother: "Try another word or remove a filter, or",
    seeAll: "see all events",
    count: (n: number) => `${n} ${n === 1 ? "event" : "events"}`,
    loading: "Loading events",
  },
  days: {
    now: "Happening now",
    today: "Today",
    tomorrow: "Tomorrow",
  },
  badges: {
    live: "Happening now",
    startsMin: (m: number) => `Starts in ${m} min`,
    startsHours: (h: number) => `Starts in ${h} h`,
    popular: "🔥 Popular",
  },
  repeat: {
    every: "Every ",
  },
  price: {
    free: "Free",
    tba: "Price TBA",
  },
  card: {
    by: "by",
    when: "When",
    where: "Where",
    nextDate: "Next date",
    next: "Next:",
    until: (date: string, n: number) => `· until ${date} (${n} dates)`,
    going: "Going",
    goingCount: (n: number) => `${n} going`,
    signUp: "Sign up",
    tickets: "Get tickets",
    moreInfo: "More info",
  },
  event: {
    ended: "This event has already happened.",
    posterFor: (title: string) => `Poster for ${title}`,
    about: "About",
    alsoOn: "Also on",
    upcomingDates: "Upcoming dates",
    viewInstagram: "View on Instagram",
    viewOriginal: "View original post",
    directions: "Directions",
    addToCalendar: "Add to calendar",
    outlookOther: "Outlook / other",
    loadError: "Couldn't load this event. Please try again in a minute.",
    notFound: "Event not found",
    notFoundBody: "This event may have been removed, or the link is incorrect.",
    seeAllEvents: "See all events",
  },
  share: {
    share: "Share",
    copied: "Link copied!",
    copyPrompt: "Copy this link:",
  },
  rsvp: {
    imGoing: "I'm going",
    youreGoing: "✓ You're going · tap to cancel",
    saving: "Saving…",
    beFirst: "Be the first to RSVP",
    people: (n: number, ended: boolean) =>
      `${n} ${n === 1 ? "person" : "people"} ${ended ? "went" : "going"}`,
    includingYou: " (including you)",
    logInToRsvp: "Log in to RSVP",
    clubCanSee:
      "The club hosting this event can see the names of people going.",
  },
  install: {
    region: (app: string) => `Install ${app}`,
    title: (app: string) => `Get ${app} on your home screen`,
    tap: "Tap",
    share: "Share",
    then: ", then",
    addToHome: "Add to Home Screen",
    android: "Open it like an app, in one tap.",
    install: "Install",
    notNow: "Not now",
  },
  search: {
    title: "Search",
    placeholder: "Event, club, place…",
    label: "Search events",
    browse: "Browse by category",
    quickPicks: "Quick picks",
    browseClubs: "Browse clubs",
  },
  clubs: {
    title: (school: string) => `Clubs at ${school}`,
    intro: "Follow the clubs you like to hear about their new events.",
    none: "No clubs yet.",
    upcoming: (n: number) => `${n} upcoming`,
    verified: "Verified",
    followers: (n: number) => `${n} ${n === 1 ? "follower" : "followers"}`,
    follow: "Follow",
    following: "✓ Following · tap to unfollow",
    followHint: "We'll email you when they post new events.",
    website: "Website",
    instagram: "Instagram",
    upcomingEvents: "Upcoming events",
    noUpcoming: "No upcoming events right now.",
    notFound: "Club not found",
    notFoundBody: "This club may have been removed, or the link is incorrect.",
    seeClubs: "See all clubs",
    logoOf: (name: string) => `${name} logo`,
  },
  account: {
    title: "My events",
    passwordChanged: "Your password has been changed.",
    going: "Going",
    nothingYet: "You haven't RSVP'd to anything yet.",
    browse: "Browse events",
    past: "Past",
    organiser: "Organiser dashboard",
    reminders: "Reminder emails",
    remindersOn:
      "We'll email you the day before events you're going to, and when clubs you follow post new events.",
    remindersOff: "Off. You won't get reminder emails.",
    loggedInAs: (email: string) => `Logged in as ${email}`,
    logOut: "Log out",
    followedClubs: "Clubs you follow",
    fromClubs: "Coming up from your clubs",
    noFollows: "Follow clubs to see their upcoming events here.",
    findClubs: "Find clubs",
    language: "Language",
    yourData: "Your data",
    downloadData: "Download my data",
    downloadHint: "A file with everything Kuku has about you.",
    deleteAccount: "Delete my account",
    deleteWarning:
      "This permanently deletes your account, your RSVPs and the clubs you follow. If you organise a club, you'll lose access to its dashboard. It can't be undone.",
    deleteConfirm: "I understand, delete everything",
    deleteButton: "Delete my account forever",
    deleting: "Deleting…",
    deleteFailed: "Couldn't delete your account. Please try again in a minute.",
    deletedTitle: "Your account has been deleted",
    deletedBody:
      "Your name, email, RSVPs and follows are gone. Thanks for trying Kuku! You can still browse events anytime.",
  },
  auth: {
    loginTitle: "Log in",
    loginIntro: "RSVP to events and keep track of what you're going to.",
    linkExpired: "That email link has expired or was already used. Log in, or",
    getNewLink: "get a new link",
    signupTitle: "Create your account",
    signupIntro: "It's free. You'll be able to RSVP to events in one tap.",
    forgotTitle: "Forgot your password?",
    forgotIntro:
      "Enter your account's email and we'll send you a link to choose a new one.",
    resetTitle: "Choose a new password",
    resetFor: (email: string) => `For ${email}`,
    resetExpired: "This link has expired or was already used.",
    sendNewLink: "Send a new link",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    atLeast8: "At least 8 characters.",
    school: "School",
    chooseSchool: "Choose your school",
    creating: "Creating your account…",
    createAccount: "Create account",
    agreeStart:
      "By creating an account you agree to how we handle your information in our",
    privacyPolicy: "privacy policy",
    agreeEnd: ". The club hosting an event you RSVP to can see your name.",
    haveAccount: "Already have an account?",
    logIn: "Log in",
    forgotLink: "Forgot your password?",
    loggingIn: "Logging in…",
    newHere: "New here?",
    createAnAccount: "Create an account",
    sending: "Sending…",
    emailMeLink: "Email me a reset link",
    remembered: "Remembered it?",
    newPassword: "New password",
    typeAgain: "Type it again",
    saving: "Saving…",
    saveNewPassword: "Save new password",
  },
  errors: {
    fullName: "Enter your full name.",
    email: "Enter a valid email address.",
    passwordShort: "Use at least 8 characters.",
    passwordLong: "Use at most 72 characters.",
    school: "Choose your school.",
    exists: "An account with this email already exists. Log in instead.",
    weakPassword: "Choose a stronger password.",
    signupFailed: "Couldn't create your account. Please try again in a minute.",
    checkEmail:
      "Almost done! Check your email for a link to confirm your account.",
    emailAndPassword: "Enter your email and password.",
    confirmFirst: "Please confirm your email first (check your inbox).",
    wrongLogin: "Wrong email or password.",
    tooMany: "Too many requests. Please wait a few minutes and try again.",
    resetSent: (email: string) =>
      `If there's an account for ${email}, we've emailed it a link to choose a new password. Check your inbox (and spam folder).`,
    mismatch: "The two passwords don't match.",
    resetExpired:
      "This reset link has expired. Request a new one from the log in page.",
    samePassword: "Choose a password different from your old one.",
    passwordFailed: "Couldn't change your password. Please try again.",
  },
};

export type Messages = typeof en;

const fr: Messages = {
  site: {
    tagline:
      "Coucou! Toutes les rencontres de clubs, conférences et partys du campus, au même endroit.",
    privacy: "Confidentialité",
    switchTo: "English",
    switchShort: "EN",
    switchLabel: "Show the site in English",
    independent:
      "Kuku est un projet étudiant indépendant, sans lien officiel avec une école.",
  },
  nav: {
    events: "Événements",
    search: "Recherche",
    post: "Publier",
    myEvents: "Mes sorties",
    main: "Principal",
  },
  header: {
    allEvents: "Tous les événements",
    changeSchool: "Changer d'école",
    logIn: "Connexion",
    myEvents: "Mes sorties",
    searchSchool: (school: string) => `Rechercher à ${school}`,
    hosting: "Tu organises un événement?",
    submitIt: "Soumets-le pour qu'il apparaisse ici →",
  },
  picker: {
    choose: "Choisis ton école",
    loadError: "Impossible de charger les écoles. Réessaie dans une minute.",
    current: "Actuelle",
  },
  filters: {
    label: "Filtrer les événements",
    categoriesLabel: "Catégories",
    today: "Aujourd'hui",
    thisWeek: "Cette semaine",
    free: "Gratuit",
    clear: "Effacer",
  },
  categories: {
    party: "🎉 Party",
    social: "👋 Social",
    sports: "⚽ Sports",
    arts: "🎨 Arts",
    cultural: "🌏 Culturel",
    academic: "📚 Études",
    career: "💼 Carrière",
    other: "✨ Autre",
  },
  categoryNames: {
    party: "Party",
    social: "Social",
    sports: "Sports",
    arts: "Arts",
    cultural: "Culturel",
    academic: "Études",
    career: "Carrière",
    other: "Autre",
  },
  campuses: {
    "Off-campus": "Hors campus",
    Online: "En ligne",
  },
  feed: {
    loadErrorTitle: "Impossible de charger les événements",
    loadErrorBody:
      "Un problème est survenu de notre côté. Réessaie dans une minute.",
    noneTitle: "Aucun événement à venir pour l'instant",
    noneBody: "D'autres événements s'en viennent, reviens bientôt!",
    noMatchSearch: (q: string) => `Aucun événement pour « ${q} »`,
    noMatch: "Rien ne correspond à ces filtres",
    tryAnother: "Essaie un autre mot ou retire un filtre, ou",
    seeAll: "vois tous les événements",
    count: (n: number) => `${n} ${n === 1 ? "événement" : "événements"}`,
    loading: "Chargement des événements",
  },
  days: {
    now: "En cours",
    today: "Aujourd'hui",
    tomorrow: "Demain",
  },
  badges: {
    live: "En cours",
    startsMin: (m: number) => `Commence dans ${m} min`,
    startsHours: (h: number) => `Commence dans ${h} h`,
    popular: "🔥 Populaire",
  },
  repeat: {
    every: "Chaque ",
  },
  price: {
    free: "Gratuit",
    tba: "Prix à venir",
  },
  card: {
    by: "par",
    when: "Quand",
    where: "Où",
    nextDate: "Prochaine date",
    next: "Prochaine :",
    until: (date: string, n: number) => `· jusqu'au ${date} (${n} dates)`,
    going: "Participants",
    goingCount: (n: number) => `${n} ${n === 1 ? "y va" : "y vont"}`,
    signUp: "S'inscrire",
    tickets: "Billets",
    moreInfo: "Plus d'infos",
  },
  event: {
    ended: "Cet événement a déjà eu lieu.",
    posterFor: (title: string) => `Affiche de ${title}`,
    about: "À propos",
    alsoOn: "Aussi le",
    upcomingDates: "Prochaines dates",
    viewInstagram: "Voir sur Instagram",
    viewOriginal: "Voir la publication",
    directions: "Itinéraire",
    addToCalendar: "Ajouter au calendrier",
    outlookOther: "Outlook / autre",
    loadError: "Impossible de charger cet événement. Réessaie dans une minute.",
    notFound: "Événement introuvable",
    notFoundBody:
      "Cet événement a peut-être été retiré, ou le lien est incorrect.",
    seeAllEvents: "Voir tous les événements",
  },
  share: {
    share: "Partager",
    copied: "Lien copié!",
    copyPrompt: "Copie ce lien :",
  },
  rsvp: {
    imGoing: "J'y vais",
    youreGoing: "✓ Tu y vas · touche pour annuler",
    saving: "Enregistrement…",
    beFirst: "Sois la première personne à y aller",
    people: (n: number, ended: boolean) =>
      `${n} ${n === 1 ? "personne" : "personnes"} ${
        ended
          ? n === 1
            ? "y est allée"
            : "y sont allées"
          : n === 1
            ? "y va"
            : "y vont"
      }`,
    includingYou: " (toi compris)",
    logInToRsvp: "Connecte-toi pour répondre",
    clubCanSee:
      "Le club qui organise cet événement peut voir le nom des personnes qui y vont.",
  },
  install: {
    region: (app: string) => `Installer ${app}`,
    title: (app: string) => `Ajoute ${app} à ton écran d'accueil`,
    tap: "Touche",
    share: "Partager",
    then: ", puis",
    addToHome: "Sur l'écran d'accueil",
    android: "Ouvre-le comme une app, en un geste.",
    install: "Installer",
    notNow: "Plus tard",
  },
  search: {
    title: "Recherche",
    placeholder: "Événement, club, lieu…",
    label: "Rechercher des événements",
    browse: "Parcourir par catégorie",
    quickPicks: "Raccourcis",
    browseClubs: "Parcourir les clubs",
  },
  clubs: {
    title: (school: string) => `Clubs à ${school}`,
    intro:
      "Suis les clubs que tu aimes pour connaître leurs nouveaux événements.",
    none: "Aucun club pour l'instant.",
    upcoming: (n: number) => `${n} à venir`,
    verified: "Vérifié",
    followers: (n: number) => `${n} ${n === 1 ? "abonné" : "abonnés"}`,
    follow: "Suivre",
    following: "✓ Suivi · touche pour ne plus suivre",
    followHint: "On t'écrit quand ce club publie un nouvel événement.",
    website: "Site web",
    instagram: "Instagram",
    upcomingEvents: "Événements à venir",
    noUpcoming: "Aucun événement à venir pour l'instant.",
    notFound: "Club introuvable",
    notFoundBody: "Ce club a peut-être été retiré, ou le lien est incorrect.",
    seeClubs: "Voir tous les clubs",
    logoOf: (name: string) => `Logo de ${name}`,
  },
  account: {
    title: "Mes sorties",
    passwordChanged: "Ton mot de passe a été changé.",
    going: "J'y vais",
    nothingYet: "Tu n'as encore répondu à aucun événement.",
    browse: "Voir les événements",
    past: "Passés",
    organiser: "Tableau de bord des organisateurs",
    reminders: "Courriels de rappel",
    remindersOn:
      "On t'écrit la veille des événements où tu vas, et quand les clubs que tu suis publient de nouveaux événements.",
    remindersOff: "Désactivés. Tu ne recevras pas de courriels de rappel.",
    loggedInAs: (email: string) => `Connecté avec ${email}`,
    logOut: "Se déconnecter",
    followedClubs: "Clubs que tu suis",
    fromClubs: "À venir dans tes clubs",
    noFollows: "Suis des clubs pour voir leurs prochains événements ici.",
    findClubs: "Trouver des clubs",
    language: "Langue",
    yourData: "Tes données",
    downloadData: "Télécharger mes données",
    downloadHint: "Un fichier avec tout ce que Kuku a sur toi.",
    deleteAccount: "Supprimer mon compte",
    deleteWarning:
      "Ceci supprime pour de bon ton compte, tes réponses aux événements et les clubs que tu suis. Si tu organises un club, tu perdras l'accès à son tableau de bord. C'est irréversible.",
    deleteConfirm: "Je comprends, tout supprimer",
    deleteButton: "Supprimer mon compte pour de bon",
    deleting: "Suppression…",
    deleteFailed:
      "Impossible de supprimer ton compte. Réessaie dans une minute.",
    deletedTitle: "Ton compte a été supprimé",
    deletedBody:
      "Ton nom, ton courriel, tes réponses et tes abonnements ont été effacés. Merci d'avoir essayé Kuku! Tu peux toujours consulter les événements.",
  },
  auth: {
    loginTitle: "Connexion",
    loginIntro: "Réponds aux événements et retrouve facilement ceux où tu vas.",
    linkExpired: "Ce lien a expiré ou a déjà été utilisé. Connecte-toi, ou",
    getNewLink: "demande un nouveau lien",
    signupTitle: "Crée ton compte",
    signupIntro:
      "C'est gratuit. Tu pourras répondre aux événements en un geste.",
    forgotTitle: "Mot de passe oublié?",
    forgotIntro:
      "Entre le courriel de ton compte et on t'enverra un lien pour en choisir un nouveau.",
    resetTitle: "Choisis un nouveau mot de passe",
    resetFor: (email: string) => `Pour ${email}`,
    resetExpired: "Ce lien a expiré ou a déjà été utilisé.",
    sendNewLink: "Envoyer un nouveau lien",
    fullName: "Nom complet",
    email: "Courriel",
    password: "Mot de passe",
    atLeast8: "Au moins 8 caractères.",
    school: "École",
    chooseSchool: "Choisis ton école",
    creating: "Création du compte…",
    createAccount: "Créer mon compte",
    agreeStart:
      "En créant un compte, tu acceptes la façon dont on traite tes informations, décrite dans notre",
    privacyPolicy: "politique de confidentialité",
    agreeEnd:
      ". Le club qui organise un événement où tu vas peut voir ton nom.",
    haveAccount: "Déjà un compte?",
    logIn: "Se connecter",
    forgotLink: "Mot de passe oublié?",
    loggingIn: "Connexion…",
    newHere: "Pas encore de compte?",
    createAnAccount: "Crée un compte",
    sending: "Envoi…",
    emailMeLink: "M'envoyer un lien",
    remembered: "Ça te revient?",
    newPassword: "Nouveau mot de passe",
    typeAgain: "Retape-le",
    saving: "Enregistrement…",
    saveNewPassword: "Enregistrer le mot de passe",
  },
  errors: {
    fullName: "Entre ton nom complet.",
    email: "Entre une adresse courriel valide.",
    passwordShort: "Utilise au moins 8 caractères.",
    passwordLong: "Utilise au plus 72 caractères.",
    school: "Choisis ton école.",
    exists: "Un compte existe déjà avec ce courriel. Connecte-toi plutôt.",
    weakPassword: "Choisis un mot de passe plus solide.",
    signupFailed: "Impossible de créer ton compte. Réessaie dans une minute.",
    checkEmail:
      "Presque fini! Regarde tes courriels pour confirmer ton compte.",
    emailAndPassword: "Entre ton courriel et ton mot de passe.",
    confirmFirst:
      "Confirme d'abord ton courriel (regarde ta boîte de réception).",
    wrongLogin: "Courriel ou mot de passe incorrect.",
    tooMany: "Trop de demandes. Attends quelques minutes et réessaie.",
    resetSent: (email: string) =>
      `S'il existe un compte pour ${email}, on vient d'y envoyer un lien pour choisir un nouveau mot de passe. Regarde ta boîte de réception (et tes pourriels).`,
    mismatch: "Les deux mots de passe ne correspondent pas.",
    resetExpired:
      "Ce lien a expiré. Demandes-en un nouveau à la page de connexion.",
    samePassword: "Choisis un mot de passe différent de l'ancien.",
    passwordFailed: "Impossible de changer ton mot de passe. Réessaie.",
  },
};

export function messages(locale: Locale): Messages {
  return locale === "fr" ? fr : en;
}

// "Off-campus" → "Hors campus" in French. School campuses (SGW…) stay as is.
export function campusName(campus: string, locale: Locale) {
  return messages(locale).campuses[campus] ?? campus;
}

// Intl formatters are slow to create, so each one is made once and reused.
const formatters = new Map<string, Intl.DateTimeFormat>();
export function dateFormat(
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) {
  const key = locale + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), options);
    formatters.set(key, f);
  }
  return f;
}
