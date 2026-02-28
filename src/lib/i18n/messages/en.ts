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
        leaderboard: 'Leaderboard',
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
        level: 'Lvl',
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
}
