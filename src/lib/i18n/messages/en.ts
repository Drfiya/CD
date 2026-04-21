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
        cancel: 'Cancel',
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
        streakPrompt: 'Start your streak! Post or comment today.',
        streakDayLabel: 'day streak',
        streakBestLabel: 'Best',
        progress: 'Progress',
        badges: 'Badges',
        ptsToLevel: 'pts to Level {level}',
        pointsToLevelFull: '{current} of {required} points to Level {level}',
        maxLevelReached: 'Max level reached!',
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

    profilePage: {
        posts: 'Posts',
        comments: 'Comments',
        lessonsCompleted: 'Lessons completed',
        enrolledCoursesOne: 'Enrolled in 1 course',
        enrolledCoursesMany: 'Enrolled in {count} courses',
        lessonsCompletedSuffixOne: ' · 1 lesson completed',
        lessonsCompletedSuffixMany: ' · {count} lessons completed',
        memberSince: 'Member since {date}',
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

    // Profile completion nudge (right sidebar widget, A4)
    profileNudge: {
        title: 'Complete your profile',
        setName: 'Set your name',
        addBio: 'Add a bio',
        uploadAvatar: 'Upload an avatar',
        finishCta: 'Finish your profile →',
        progressSuffix: 'of 3 complete',
    },

    // Activation onboarding wizard (feed banner, B1)
    activation: {
        title: 'Welcome! Finish setup',
        stepSignUp: 'Sign up',
        stepProfile: 'Complete your profile',
        stepEnrollment: 'Enroll in a course',
        stepFirstPost: 'Write your first post',
        dismiss: 'Dismiss',
        welcomeToastTitle: 'Welcome to the community!',
        welcomeToastSubtitle: 'You earned the Welcome badge 🎉',
    },
    landing_social_proof: {
        heroJoinCta: 'Join the community',
        featuredCoursesTitle: 'Featured Courses',
        featuredCoursesEmpty: 'Courses coming soon — stay tuned!',
        recentPostsTitle: 'Latest from the community',
        recentPostsAuthor: 'A member posted',
        weekInNumbersTitle: 'This Week',
        weekNewPosts: 'new posts',
        weekActiveDiscussions: 'active discussions',
        weekLessonsCompleted: 'lessons completed',
        memberCountTemplate: 'Join {count}+ Science Experts',
        enrolledCountLabel: 'enrolled',
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
        cancel: string;
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
        streakPrompt: string;
        streakDayLabel: string;
        streakBestLabel: string;
        progress: string;
        badges: string;
        ptsToLevel: string;
        pointsToLevelFull: string;
        maxLevelReached: string;
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
    profilePage: {
        posts: string;
        comments: string;
        lessonsCompleted: string;
        enrolledCoursesOne: string;
        enrolledCoursesMany: string;
        lessonsCompletedSuffixOne: string;
        lessonsCompletedSuffixMany: string;
        memberSince: string;
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
    profileNudge: {
        title: string;
        setName: string;
        addBio: string;
        uploadAvatar: string;
        finishCta: string;
        progressSuffix: string;
    };
    activation: {
        title: string;
        stepSignUp: string;
        stepProfile: string;
        stepEnrollment: string;
        stepFirstPost: string;
        dismiss: string;
        welcomeToastTitle: string;
        welcomeToastSubtitle: string;
    };
    landing_social_proof: {
        heroJoinCta: string;
        featuredCoursesTitle: string;
        featuredCoursesEmpty: string;
        recentPostsTitle: string;
        recentPostsAuthor: string;
        weekInNumbersTitle: string;
        weekNewPosts: string;
        weekActiveDiscussions: string;
        weekLessonsCompleted: string;
        memberCountTemplate: string;
        enrolledCountLabel: string;
    };
}
