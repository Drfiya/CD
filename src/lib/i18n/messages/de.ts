/**
 * German translations
 */
import type { Messages } from './en';

export const de: Messages = {
    // Navigation
    nav: {
        home: 'Start',
        feed: 'Feed',
        community: 'Community',
        classroom: 'Kurse',
        calendar: 'Kalender',
        members: 'Mitglieder',
        aiTools: 'KI-Tools',
        leaderboards: 'Top-Lernende',
        settings: 'Einstellungen',
        admin: 'Admin',
    },

    // Search
    search: {
        placeholder: 'Suchen...',
        placeholderFull: 'Beiträge, Mitglieder, Kurse suchen...',
    },

    // Categories sidebar
    categories: {
        title: 'Kategorien',
        allPosts: 'Alle Beiträge',
    },

    // Right sidebar
    sidebar: {
        members: 'Mitglieder',
        leaderboard: 'Top-Lernende',
        viewAll: 'Alle anzeigen',
    },

    // Post creation
    post: {
        writeSomething: 'Schreibe etwas...',
        post: 'Veröffentlichen',
        edit: 'Bearbeiten',
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        createNewPost: 'Neuen Beitrag erstellen',
        category: 'Kategorie',
        postTitle: 'Beitragstitel',
        titlePlaceholder: 'Titel für deinen Beitrag (optional)',
        content: 'Inhalt',
        contentPlaceholder: 'Was möchtest du teilen?',
        imageVideo: 'Bild/Video',
        link: 'Link',
    },

    // Post menu (three-dot dropdown)
    postMenu: {
        copyLink: 'Link kopieren',
        copied: 'Kopiert!',
        editPost: 'Beitrag bearbeiten',
        deletePost: 'Beitrag löschen',
        confirmDelete: 'Bist du sicher?',
        deleting: 'Löschen...',
        cancel: 'Abbrechen',
    },

    // Category names (DB-stored categories)
    categoryNames: {
        Announcements: 'Ankündigungen',
        General: 'Allgemein',
        Introductions: 'Vorstellungen',
        Questions: 'Fragen',
    },

    // Comments
    comment: {
        writeComment: 'Kommentar schreiben...',
        reply: 'Antworten',
        replies: 'Antworten',
    },

    // Gamification
    gamification: {
        level: 'Stufe',
        points: 'Punkte',
        streakPrompt: 'Starte deine Serie! Poste oder kommentiere heute.',
        streakDayLabel: 'Tage-Serie',
        streakBestLabel: 'Beste',
    },

    // Auth
    auth: {
        signIn: 'Anmelden',
        signOut: 'Abmelden',
        editProfile: 'Profil bearbeiten',
    },

    // Common
    common: {
        loading: 'Wird geladen...',
        error: 'Fehler',
        noResults: 'Keine Ergebnisse gefunden',
    },

    // Members page
    membersPage: {
        title: 'Mitglieder',
        member: 'Mitglied',
        members: 'Mitglieder',
        inTheCommunity: 'in der Community',
        searchPlaceholder: 'Mitglieder suchen...',
        filtersTitle: 'Filter',
        allMembers: 'Alle Mitglieder',
        communityStats: 'Community-Statistiken',
        completed: 'Abgeschlossen',
        courses: 'Kurse',
    },

    // Events page
    eventsPage: {
        aboutThisEvent: 'Über dieses Event',
        location: 'Ort',
        weeklyEvent: 'Wöchentliches Event',
        monthlyEvent: 'Monatliches Event',
        backToCalendar: 'Zurück zum Kalender',
        createdBy: 'Erstellt von',
        noUpcomingEvents: 'Keine kommenden Events',
        checkBackLater: 'Schau später nochmal vorbei für neue Events.',
        today: 'Heute',
        tomorrow: 'Morgen',
        thisWeek: 'Diese Woche',
        weekly: 'Wöchentlich',
        monthly: 'Monatlich',
    },

    // Profile page
    profilePage: {
        posts: 'Beiträge',
        comments: 'Kommentare',
        lessonsCompleted: 'Abgeschlossene Lektionen',
        enrolledCoursesOne: 'In 1 Kurs eingeschrieben',
        enrolledCoursesMany: 'In {count} Kursen eingeschrieben',
        lessonsCompletedSuffixOne: ' · 1 Lektion abgeschlossen',
        lessonsCompletedSuffixMany: ' · {count} Lektionen abgeschlossen',
    },

    // Classroom page
    classroomPage: {
        title: 'Kursbereich',
        subtitle: 'Kurse durchsuchen und deinen Lernfortschritt verfolgen.',
        myCourses: 'Meine Kurse',
        availableCourses: 'Verfügbare Kurse',
        signInPrompt: 'um dich für Kurse einzuschreiben und deinen Fortschritt zu verfolgen.',
        lessons: 'Lektionen',
        lesson: 'Lektion',
        completed: 'Abgeschlossen',
        continueLearning: 'Weiterlernen',
        startCourse: 'Kurs starten',
        viewCourse: 'Kurs ansehen →',
        noCoursesAvailable: 'Keine Kurse verfügbar',
        checkBackSoon: 'Schau bald wieder vorbei für neue Kurse.',
        noEnrolledCourses: 'Keine eingeschriebenen Kurse',
        notEnrolledYet: 'Du hast dich noch für keinen Kurs eingeschrieben.',
        allCourses: 'Alle Kurse',
        coursesCategory: 'Kurse',
        myProgress: 'Mein Fortschritt',
        enrolled: 'Eingeschrieben',
        lessonsLabel: 'Lektionen',
        courseContent: 'Kursinhalt',
        enrollToAccessLessons: 'Melde dich an, um alle Lektionen dieses Kurses freizuschalten.',
        backToCourse: 'Zurück zum Kurs',
        nextLesson: 'Nächste Lektion',
    },

    profileNudge: {
        title: 'Profil vervollständigen',
        setName: 'Namen festlegen',
        addBio: 'Kurzbeschreibung hinzufügen',
        uploadAvatar: 'Profilbild hochladen',
        finishCta: 'Profil abschließen →',
        progressSuffix: 'von 3 erledigt',
    },

    activation: {
        title: 'Willkommen! Einrichtung abschließen',
        stepSignUp: 'Registrierung',
        stepProfile: 'Profil vervollständigen',
        stepEnrollment: 'In einen Kurs einschreiben',
        stepFirstPost: 'Ersten Beitrag schreiben',
        dismiss: 'Ausblenden',
        welcomeToastTitle: 'Willkommen in der Community!',
        welcomeToastSubtitle: 'Du hast das Willkommens-Abzeichen erhalten 🎉',
    },
    landing_social_proof: {
        heroJoinCta: 'Der Community beitreten',
        featuredCoursesTitle: 'Ausgewählte Kurse',
        featuredCoursesEmpty: 'Kurse bald verfügbar — bleib dran!',
        recentPostsTitle: 'Neues aus der Community',
        recentPostsAuthor: 'Ein Mitglied hat gepostet',
        weekInNumbersTitle: 'Diese Woche',
        weekNewPosts: 'neue Beiträge',
        weekActiveDiscussions: 'aktive Diskussionen',
        weekLessonsCompleted: 'abgeschlossene Lektionen',
        memberCountTemplate: 'Werde Teil von {count}+ Science Experts',
        enrolledCountLabel: 'eingeschrieben',
    },
};
