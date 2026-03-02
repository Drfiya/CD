/**
 * English translations (base language)
 */
export const en: Messages = {
    // Navigation
    nav: {
        community: 'Community',
        classroom: 'Classroom',
        calendar: 'Calendar',
        members: 'Members',
        aiTools: 'AI Tools',
        leaderboards: 'Top Learners',
        settings: 'Settings',
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
    },
};

// Define Messages type with string values (not literal types)
export interface Messages {
    nav: {
        community: string;
        classroom: string;
        calendar: string;
        members: string;
        aiTools: string;
        leaderboards: string;
        settings: string;
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
    };
}
