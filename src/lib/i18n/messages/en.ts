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
        backToFeed: 'Back to Feed',
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
        cancel: 'Cancel',
        delete: 'Delete',
        confirmDelete: 'Sure?',
        confirmYes: 'Yes',
        confirmNo: 'No',
        show: 'Show',
        hide: 'Hide',
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
    dm: {
        navLabel: 'Messages',
        inboxTitle: 'Messages',
        emptyInboxTitle: 'No conversations yet',
        emptyInboxBody: 'Open a member’s profile and tap "Send message" to start a conversation.',
        selectConversation: 'Select a conversation to start chatting.',
        newMessagePlaceholder: 'Write a message…',
        send: 'Send',
        sending: 'Sending…',
        retry: 'Retry',
        sendFailed: 'Could not send. Tap to retry.',
        youBlockedThisUser: 'You blocked this user. Unblock to continue.',
        theyBlockedYou: 'You can no longer send messages in this conversation.',
        block: 'Block',
        unblock: 'Unblock',
        confirmBlockTitle: 'Block this user?',
        confirmBlockBody: 'They won’t be able to send you messages, and this conversation will be hidden from your inbox.',
        cancel: 'Cancel',
        sendMessageCta: 'Send message',
        backToInbox: 'Back',
        unreadLabel: 'unread',
        // Round 3 / A4 — replaces the prior `rateLimited` constant so the UI always
        // surfaces the exact `retryAfterSec` from the server action.
        rateLimitedWithSeconds: 'Too fast. Please retry in {seconds} seconds.',
        loading: 'Loading…',
        loadOlder: 'Load older messages',
        messageEmptyError: 'Message cannot be empty.',
        deliveredAriaLabel: 'Delivered',
        readAriaLabel: 'Read',
        connecting: 'Connecting…',
        reconnecting: 'Reconnecting…',
        // Round 3 / Item 5 — File Attachments (images + PDFs only)
        attachmentButton: 'Attach a file',
        attachmentRemove: 'Remove attachment',
        attachmentUploading: 'Uploading…',
        attachmentTooLarge: 'File too large: max {mb} MB.',
        attachmentInvalidType: 'File type not supported. Images (JPG, PNG, WebP) or PDFs only.',
        attachmentUploadFailed: 'Upload failed. Please try again.',
        attachmentDownload: 'Download',
        attachmentOpenImage: 'Open full-size image',
        attachmentImageAlt: 'Image attachment: {name}',
        // Round 4 — Drag-Drop + Emoji Picker
        dropFileToAttach: 'Drop file to attach',
        openEmojiPicker: 'Open emoji picker',
        closeEmojiPicker: 'Close emoji picker',
        // Round 5 — Smart Timestamps + Block UX
        messageDateToday: 'Today',
        messageDateYesterday: 'Yesterday',
        confirmUnblockTitle: 'Unblock this user?',
        confirmUnblockBody: 'They will be able to send you messages again.',
        // Round 6 / A2 — Inbox attachment preview hints
        inboxAttachmentPhoto: '📷 Photo',
        inboxAttachmentDocument: '📄 Document',
        // Round 8 — Pagination
        loadMoreMessages: 'Load older messages',
        loadingMoreMessages: 'Loading…',
        loadMoreConversations: 'Load more',
        loadingMoreConversations: 'Loading…',
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
    // CR14 — Bug Reporter (admin-only floating button + command center tab)
    bugReporter: {
        buttonAriaLabel: 'Report a bug',
        modalTitle: 'Report a Bug',
        fieldTitle: 'Title',
        fieldTitlePlaceholder: 'Brief description of the bug',
        fieldDescription: 'Description',
        fieldDescriptionPlaceholder: 'Steps to reproduce, expected vs actual behaviour…',
        fieldPriority: 'Priority',
        fieldReproducibility: 'Reproducibility',
        fieldCategory: 'Category',
        fieldPageUrl: 'Page URL',
        fieldScreenshots: 'Screenshots',
        fieldScreenshotsHint: 'optional, max 5',
        priorityP1: 'P1 — Critical',
        priorityP2: 'P2 — High',
        priorityP3: 'P3 — Medium',
        priorityP4: 'P4 — Low',
        reproducibilityAlways: 'Always',
        reproducibilitySometimes: 'Sometimes',
        reproducibilityOnce: 'Once',
        submit: 'Submit Bug Report',
        submitting: 'Submitting…',
        cancel: 'Cancel',
        submitSuccess: 'Bug report submitted',
        submitError: 'Failed to submit bug report',
        screenshotDropHint: 'Drop screenshots here, paste (Cmd+V), or click to pick',
        screenshotTypeHint: 'JPEG · PNG · WebP · GIF · max 5 MB each',
        screenshotAtLimit: 'Max 5 screenshots reached',
        screenshotUploading: 'Uploading…',
        screenshotTooLarge: 'Screenshot too large — max 5 MB',
        screenshotInvalidType: 'Only JPEG, PNG, WebP, and GIF screenshots allowed',
        screenshotUploadFailed: 'Screenshot upload failed — please try again',
        tablePageTitle: 'Bug Reports',
        tablePageSubtitle: 'Triage and track bugs submitted by the team.',
        tableExportPdf: 'Export PDF ↗',
        tableFilterAllStatuses: 'All Statuses',
        tableFilterAllPriorities: 'All Priorities',
        tableLoadMore: 'Load more',
        tableLoadingMore: 'Loading…',
        tableEmpty: 'No bug reports found',
        tableColPriority: 'Priority',
        tableColTitle: 'Title',
        tableColCategory: 'Category',
        tableColUrl: 'URL',
        tableColReported: 'Reported',
        tableColStatus: 'Status',
        tableColReporter: 'Reporter',
        tableColScreenshots: 'Screenshots',
        statusOpen: 'Open',
        statusInProgress: 'In Progress',
        statusResolved: 'Resolved',
        statusClosed: 'Closed',
        navLabel: 'Bug Reports',
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
        backToFeed: string;
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
        cancel: string;
        delete: string;
        confirmDelete: string;
        confirmYes: string;
        confirmNo: string;
        show: string;
        hide: string;
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
    // CR12 — Direct Messages
    dm: {
        navLabel: string;
        inboxTitle: string;
        emptyInboxTitle: string;
        emptyInboxBody: string;
        selectConversation: string;
        newMessagePlaceholder: string;
        send: string;
        sending: string;
        retry: string;
        sendFailed: string;
        youBlockedThisUser: string;
        theyBlockedYou: string;
        block: string;
        unblock: string;
        confirmBlockTitle: string;
        confirmBlockBody: string;
        cancel: string;
        sendMessageCta: string;
        backToInbox: string;
        unreadLabel: string;
        // Round 3 / A4 — template returns "Too fast. Please retry in N seconds." for N>=2
        // and "… in 1 second." for the singular. All four locales must implement this exact
        // signature (strict TS enforces parity per feedback/shared_interface_forces_scope_creep.md).
        rateLimitedWithSeconds: string;
        loading: string;
        loadOlder: string;
        messageEmptyError: string;
        deliveredAriaLabel: string;
        readAriaLabel: string;
        connecting: string;
        reconnecting: string;
        // Round 3 / Item 5 — File Attachments (JPG/PNG/WebP/PDF, 10 MB hard cap).
        attachmentButton: string;
        attachmentRemove: string;
        attachmentUploading: string;
        attachmentTooLarge: string;
        attachmentInvalidType: string;
        attachmentUploadFailed: string;
        attachmentDownload: string;
        attachmentOpenImage: string;
        attachmentImageAlt: string;
        // Round 4 — Drag-Drop + Emoji Picker
        dropFileToAttach: string;
        openEmojiPicker: string;
        closeEmojiPicker: string;
        // Round 5 — Smart Timestamps + Block UX
        messageDateToday: string;
        messageDateYesterday: string;
        confirmUnblockTitle: string;
        confirmUnblockBody: string;
        // Round 6 / A2 — Inbox attachment preview hints
        inboxAttachmentPhoto: string;
        inboxAttachmentDocument: string;
        // Round 8 — Pagination
        loadMoreMessages: string;
        loadingMoreMessages: string;
        loadMoreConversations: string;
        loadingMoreConversations: string;
    };
    // CR14 — Bug Reporter
    bugReporter: {
        buttonAriaLabel: string;
        modalTitle: string;
        fieldTitle: string;
        fieldTitlePlaceholder: string;
        fieldDescription: string;
        fieldDescriptionPlaceholder: string;
        fieldPriority: string;
        fieldReproducibility: string;
        fieldCategory: string;
        fieldPageUrl: string;
        fieldScreenshots: string;
        fieldScreenshotsHint: string;
        priorityP1: string;
        priorityP2: string;
        priorityP3: string;
        priorityP4: string;
        reproducibilityAlways: string;
        reproducibilitySometimes: string;
        reproducibilityOnce: string;
        submit: string;
        submitting: string;
        cancel: string;
        submitSuccess: string;
        submitError: string;
        screenshotDropHint: string;
        screenshotTypeHint: string;
        screenshotAtLimit: string;
        screenshotUploading: string;
        screenshotTooLarge: string;
        screenshotInvalidType: string;
        screenshotUploadFailed: string;
        tablePageTitle: string;
        tablePageSubtitle: string;
        tableExportPdf: string;
        tableFilterAllStatuses: string;
        tableFilterAllPriorities: string;
        tableLoadMore: string;
        tableLoadingMore: string;
        tableEmpty: string;
        tableColPriority: string;
        tableColTitle: string;
        tableColCategory: string;
        tableColUrl: string;
        tableColReported: string;
        tableColStatus: string;
        tableColReporter: string;
        tableColScreenshots: string;
        statusOpen: string;
        statusInProgress: string;
        statusResolved: string;
        statusClosed: string;
        navLabel: string;
    };
}
