/**
 * English translations (base language)
 */
export const en: Messages = {
    // Navigation
    nav: {
        home: 'Home',
        feed: 'Feed',
        community: 'Community',
        classroom: 'Classroom',
        calendar: 'Calendar',
        members: 'Members',
        aiTools: 'AI Tools',
        leaderboards: 'Top Learners',
        settings: 'Settings',
        admin: 'Admin',
    },

    // Search
    search: {
        placeholder: 'Search...',
        placeholderFull: 'Search posts, members, courses...',
    },

    // Categories sidebar
    categories: {
        title: 'Categories',
        allPosts: 'All Posts',
    },

    // Right sidebar
    sidebar: {
        members: 'Members',
        leaderboard: 'Top Learners',
        viewAll: 'View all',
    },

    // Post creation
    post: {
        writeSomething: 'Write something...',
        post: 'Post',
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        createNewPost: 'Create New Post',
        category: 'Category',
        postTitle: 'Post Title',
        titlePlaceholder: 'Enter a title for your post (optional)',
        content: 'Content',
        contentPlaceholder: 'What would you like to share?',
        imageVideo: 'Image/Video',
        link: 'Link',
    },

    // Post menu (three-dot dropdown)
    postMenu: {
        copyLink: 'Copy link',
        copied: 'Copied!',
        editPost: 'Edit post',
        deletePost: 'Delete post',
        confirmDelete: 'Are you sure?',
        deleting: 'Deleting...',
    },

    // Category names (DB-stored categories)
    categoryNames: {
        Announcements: 'Announcements',
        General: 'General',
        Introductions: 'Introductions',
        Questions: 'Questions',
    },

    // Comments
    comment: {
        writeComment: 'Write a comment...',
        reply: 'Reply',
        replies: 'Replies',
    },

    // Gamification
    gamification: {
        level: 'Level',
        points: 'points',
    },

    // Auth
    auth: {
        signIn: 'Sign in',
        signOut: 'Sign out',
        editProfile: 'Edit Profile',
    },

    // Common
    common: {
        loading: 'Loading...',
        error: 'Error',
        noResults: 'No results found',
    },

    // Members page
    membersPage: {
        title: 'Members',
        member: 'member',
        members: 'members',
        inTheCommunity: 'in the community',
        searchPlaceholder: 'Search members...',
        filtersTitle: 'Filters',
        allMembers: 'All Members',
        communityStats: 'Community Stats',
        completed: 'Completed',
        courses: 'Courses',
    },

    // Classroom page
    // Events page
    eventsPage: {
        aboutThisEvent: 'About this event',
        location: 'Location',
        weeklyEvent: 'Weekly Event',
        monthlyEvent: 'Monthly Event',
        backToCalendar: 'Back to Calendar',
        createdBy: 'Created by',
        noUpcomingEvents: 'No upcoming events',
        checkBackLater: 'Check back later for new events.',
        today: 'Today',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        weekly: 'Weekly',
        monthly: 'Monthly',
    },

    classroomPage: {
        title: 'Classroom',
        subtitle: 'Browse courses and track your learning progress.',
        myCourses: 'My Courses',
        availableCourses: 'Available Courses',
        signInPrompt: 'to enroll in courses and track your progress.',
        lessons: 'lessons',
        lesson: 'lesson',
        completed: 'Completed',
        continueLearning: 'Continue Learning',
        startCourse: 'Start Course',
        viewCourse: 'View Course →',
        noCoursesAvailable: 'No courses available',
        checkBackSoon: 'Check back soon for new courses.',
        noEnrolledCourses: 'No enrolled courses',
        notEnrolledYet: "You haven't enrolled in any courses yet.",
        allCourses: 'All Courses',
        coursesCategory: 'Courses',
        myProgress: 'My Progress',
        enrolled: 'Enrolled',
        lessonsLabel: 'Lessons',
        courseContent: 'Course Content',
        enrollToAccessLessons: 'Enroll to access all lessons in this course.',
        backToCourse: 'Back to Course',
        nextLesson: 'Next Lesson',
    },
};

// Define Messages type with string values (not literal types)
export interface Messages {
    nav: {
        home: string;
        feed: string;
        community: string;
        classroom: string;
        calendar: string;
        members: string;
        aiTools: string;
        leaderboards: string;
        settings: string;
        admin: string;
    };
    search: {
        placeholder: string;
        placeholderFull: string;
    };
    categories: {
        title: string;
        allPosts: string;
    };
    sidebar: {
        members: string;
        leaderboard: string;
        viewAll: string;
    };
    post: {
        writeSomething: string;
        post: string;
        edit: string;
        save: string;
        cancel: string;
        delete: string;
        createNewPost: string;
        category: string;
        postTitle: string;
        titlePlaceholder: string;
        content: string;
        contentPlaceholder: string;
        imageVideo: string;
        link: string;
    };
    postMenu: {
        copyLink: string;
        copied: string;
        editPost: string;
        deletePost: string;
        confirmDelete: string;
        deleting: string;
    };
    categoryNames: {
        Announcements: string;
        General: string;
        Introductions: string;
        Questions: string;
    };
    comment: {
        writeComment: string;
        reply: string;
        replies: string;
    };
    gamification: {
        level: string;
        points: string;
    };
    auth: {
        signIn: string;
        signOut: string;
        editProfile: string;
    };
    common: {
        loading: string;
        error: string;
        noResults: string;
    };
    membersPage: {
        title: string;
        member: string;
        members: string;
        inTheCommunity: string;
        searchPlaceholder: string;
        filtersTitle: string;
        allMembers: string;
        communityStats: string;
        completed: string;
        courses: string;
    };
    eventsPage: {
        aboutThisEvent: string;
        location: string;
        weeklyEvent: string;
        monthlyEvent: string;
        backToCalendar: string;
        createdBy: string;
        noUpcomingEvents: string;
        checkBackLater: string;
        today: string;
        tomorrow: string;
        thisWeek: string;
        weekly: string;
        monthly: string;
    };
    classroomPage: {
        title: string;
        subtitle: string;
        myCourses: string;
        availableCourses: string;
        signInPrompt: string;
        lessons: string;
        lesson: string;
        completed: string;
        continueLearning: string;
        startCourse: string;
        viewCourse: string;
        noCoursesAvailable: string;
        checkBackSoon: string;
        noEnrolledCourses: string;
        notEnrolledYet: string;
        allCourses: string;
        coursesCategory: string;
        myProgress: string;
        enrolled: string;
        lessonsLabel: string;
        courseContent: string;
        enrollToAccessLessons: string;
        backToCourse: string;
        nextLesson: string;
    };
}
