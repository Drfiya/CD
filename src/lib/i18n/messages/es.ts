/**
 * Spanish translations
 */
import type { Messages } from './en';

export const es: Messages = {
    // Navigation
    nav: {
        home: 'Inicio',
        feed: 'Feed',
        community: 'Comunidad',
        classroom: 'Aula',
        calendar: 'Calendario',
        members: 'Miembros',
        aiTools: 'IA Tools',
        leaderboards: 'Top Aprendices',
        settings: 'Configuración',
        admin: 'Admin',
    },

    // Search
    search: {
        placeholder: 'Buscar...',
        placeholderFull: 'Buscar publicaciones, miembros, cursos...',
    },

    // Categories sidebar
    categories: {
        title: 'Categorías',
        allPosts: 'Todas las publicaciones',
    },

    // Right sidebar
    sidebar: {
        members: 'Miembros',
        leaderboard: 'Top Aprendices',
        viewAll: 'Ver todo',
    },

    // Post creation
    post: {
        writeSomething: 'Escribe algo...',
        post: 'Publicar',
        edit: 'Editar',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        createNewPost: 'Crear nueva publicación',
        category: 'Categoría',
        postTitle: 'Título de la publicación',
        titlePlaceholder: 'Ingresa un título para tu publicación (opcional)',
        content: 'Contenido',
        contentPlaceholder: '¿Qué te gustaría compartir?',
        imageVideo: 'Imagen/Video',
        link: 'Enlace',
    },

    // Post menu (three-dot dropdown)
    postMenu: {
        copyLink: 'Copiar enlace',
        copied: '¡Copiado!',
        editPost: 'Editar publicación',
        deletePost: 'Eliminar publicación',
        confirmDelete: '¿Estás seguro?',
        deleting: 'Eliminando...',
    },

    // Category names (DB-stored categories)
    categoryNames: {
        Announcements: 'Anuncios',
        General: 'General',
        Introductions: 'Presentaciones',
        Questions: 'Preguntas',
    },

    // Comments
    comment: {
        writeComment: 'Escribe un comentario...',
        reply: 'Responder',
        replies: 'Respuestas',
    },

    // Gamification
    gamification: {
        level: 'Nivel',
        points: 'puntos',
    },

    // Auth
    auth: {
        signIn: 'Iniciar sesión',
        signOut: 'Cerrar sesión',
        editProfile: 'Editar perfil',
    },

    // Common
    common: {
        loading: 'Cargando...',
        error: 'Error',
        noResults: 'No se encontraron resultados',
    },

    // Members page
    membersPage: {
        title: 'Miembros',
        member: 'miembro',
        members: 'miembros',
        inTheCommunity: 'en la comunidad',
        searchPlaceholder: 'Buscar miembros...',
        filtersTitle: 'Filtros',
        allMembers: 'Todos los miembros',
        communityStats: 'Estadísticas',
        completed: 'Completado',
        courses: 'Cursos',
    },

    // Events page
    eventsPage: {
        aboutThisEvent: 'Acerca de este evento',
        location: 'Ubicación',
        weeklyEvent: 'Evento semanal',
        monthlyEvent: 'Evento mensual',
        backToCalendar: 'Volver al calendario',
        createdBy: 'Creado por',
        noUpcomingEvents: 'No hay eventos próximos',
        checkBackLater: 'Vuelve más tarde para nuevos eventos.',
        today: 'Hoy',
        tomorrow: 'Mañana',
        thisWeek: 'Esta semana',
        weekly: 'Semanal',
        monthly: 'Mensual',
    },

    // Classroom page
    classroomPage: {
        title: 'Aula',
        subtitle: 'Explorar cursos y seguir tu progreso de aprendizaje.',
        myCourses: 'Mis cursos',
        availableCourses: 'Cursos disponibles',
        signInPrompt: 'para inscribirte en cursos y seguir tu progreso.',
        lessons: 'lecciones',
        lesson: 'lección',
        completed: 'Completado',
        continueLearning: 'Continuar',
        startCourse: 'Iniciar curso',
        viewCourse: 'Ver curso →',
        noCoursesAvailable: 'No hay cursos disponibles',
        checkBackSoon: 'Vuelve pronto para nuevos cursos.',
        noEnrolledCourses: 'No hay cursos inscritos',
        notEnrolledYet: 'Aún no te has inscrito en ningún curso.',
        allCourses: 'Todos los cursos',
        coursesCategory: 'Cursos',
        myProgress: 'Mi progreso',
        enrolled: 'Inscrito',
        lessonsLabel: 'Lecciones',
        courseContent: 'Contenido del curso',
        enrollToAccessLessons: 'Inscríbete para acceder a todas las lecciones de este curso.',
        backToCourse: 'Volver al curso',
        nextLesson: 'Siguiente lección',
    },
};

