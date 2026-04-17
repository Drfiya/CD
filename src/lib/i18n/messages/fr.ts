/**
 * French translations
 */
import type { Messages } from './en';

export const fr: Messages = {
    // Navigation
    nav: {
        home: 'Accueil',
        feed: 'Fil',
        community: 'Communauté',
        classroom: 'Cours',
        calendar: 'Calendrier',
        members: 'Membres',
        aiTools: 'Outils IA',
        leaderboards: 'Top Apprenants',
        settings: 'Paramètres',
        admin: 'Admin',
    },

    // Search
    search: {
        placeholder: 'Rechercher...',
        placeholderFull: 'Rechercher publications, membres, cours...',
    },

    // Categories sidebar
    categories: {
        title: 'Catégories',
        allPosts: 'Toutes les publications',
    },

    // Right sidebar
    sidebar: {
        members: 'Membres',
        leaderboard: 'Top Apprenants',
        viewAll: 'Voir tout',
    },

    // Post creation
    post: {
        writeSomething: 'Écrivez quelque chose...',
        post: 'Publier',
        edit: 'Modifier',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        createNewPost: 'Créer une publication',
        category: 'Catégorie',
        postTitle: 'Titre de la publication',
        titlePlaceholder: 'Entrez un titre pour votre publication (optionnel)',
        content: 'Contenu',
        contentPlaceholder: 'Que souhaitez-vous partager ?',
        imageVideo: 'Image/Vidéo',
        link: 'Lien',
    },

    // Category names (DB-stored categories)
    categoryNames: {
        Announcements: 'Annonces',
        General: 'Général',
        Introductions: 'Présentations',
        Questions: 'Questions',
    },

    // Comments
    comment: {
        writeComment: 'Écrire un commentaire...',
        reply: 'Répondre',
        replies: 'Réponses',
    },

    // Gamification
    gamification: {
        level: 'Niveau',
        points: 'points',
    },

    // Auth
    auth: {
        signIn: 'Se connecter',
        signOut: 'Se déconnecter',
        editProfile: 'Modifier le profil',
    },

    // Common
    common: {
        loading: 'Chargement...',
        error: 'Erreur',
        noResults: 'Aucun résultat trouvé',
    },

    // Members page
    membersPage: {
        title: 'Membres',
        member: 'membre',
        members: 'membres',
        inTheCommunity: 'dans la communauté',
        searchPlaceholder: 'Rechercher des membres...',
        filtersTitle: 'Filtres',
        allMembers: 'Tous les membres',
        communityStats: 'Statistiques',
        completed: 'Terminé',
        courses: 'Cours',
    },

    // Events page
    eventsPage: {
        aboutThisEvent: 'À propos de cet événement',
        location: 'Lieu',
        weeklyEvent: 'Événement hebdomadaire',
        monthlyEvent: 'Événement mensuel',
        backToCalendar: 'Retour au calendrier',
        createdBy: 'Créé par',
        noUpcomingEvents: 'Aucun événement à venir',
        checkBackLater: 'Revenez plus tard pour de nouveaux événements.',
        today: "Aujourd'hui",
        tomorrow: 'Demain',
        thisWeek: 'Cette semaine',
        weekly: 'Hebdomadaire',
        monthly: 'Mensuel',
    },

    // Classroom page
    classroomPage: {
        title: 'Salle de classe',
        subtitle: 'Parcourir les cours et suivre votre progression.',
        myCourses: 'Mes cours',
        availableCourses: 'Cours disponibles',
        signInPrompt: 'pour vous inscrire aux cours et suivre votre progression.',
        lessons: 'leçons',
        lesson: 'leçon',
        completed: 'Terminé',
        continueLearning: 'Continuer',
        startCourse: 'Commencer le cours',
        viewCourse: 'Voir le cours →',
        noCoursesAvailable: 'Aucun cours disponible',
        checkBackSoon: 'Revenez bientôt pour de nouveaux cours.',
        noEnrolledCourses: 'Aucun cours inscrit',
        notEnrolledYet: "Vous n'êtes inscrit à aucun cours.",
        allCourses: 'Tous les cours',
        coursesCategory: 'Cours',
        myProgress: 'Ma progression',
        enrolled: 'Inscrit',
        lessonsLabel: 'Leçons',
        courseContent: 'Contenu du cours',
        enrollToAccessLessons: 'Inscrivez-vous pour accéder à toutes les leçons de ce cours.',
        backToCourse: 'Retour au cours',
        nextLesson: 'Leçon suivante',
    },
};
