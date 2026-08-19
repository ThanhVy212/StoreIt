export const navItems = [
    {
        name: 'Dashboard',
        icon: '/assets/icons/dashboard.svg',
        url: '/',
    },
    {
        name: 'Documents',
        icon: '/assets/icons/documents.svg',
        url: '/documents',
    },
    {
        name: 'Images',
        icon: '/assets/icons/images.svg',
        url: '/images',
    },
    {
        name: 'Video',
        icon: '/assets/icons/video.svg',
        url: '/video',
    },
    {
        name: 'Audio',
        icon: '/assets/icons/audio.svg',
        url: '/audio',
    },
    {
        name: 'Others',
        icon: '/assets/icons/others.svg',
        url: '/others',
    },
];

export const actionsDropdownItems = [
    {
        label: 'Rename',
        icon: '/assets/icons/edit.svg',
        value: 'rename',
    },
    {
        label: 'Details',
        icon: '/assets/icons/info.svg',
        value: 'details',
    },
    {
        label: 'Share',
        icon: '/assets/icons/share.svg',
        value: 'share',
    },
    {
        label: 'Download',
        icon: '/assets/icons/download.svg',
        value: 'download',
    },
    {
        label: 'Delete',
        icon: '/assets/icons/delete.svg',
        value: 'delete',
    },
];

export const sortTypes = [
    {
        label: 'Date created (newest)',
        value: '$createdAt-desc',
    },
    {
        label: 'Created Date (oldest)',
        value: '$createdAt-asc',
    },
    {
        label: 'Name (A-Z)',
        value: 'name-asc',
    },
    {
        label: 'Name (Z-A)',
        value: 'name-desc',
    },
    {
        label: 'Size (Highest)',
        value: 'size-desc',
    },
    {
        label: 'Size (Lowest)',
        value: 'size-asc',
    },
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const avatarPlaceholderUrl = "https://png.pngtree.com/png-vector/20210604/ourmid/pngtree-gray-avatar-placeholder-png-image_3416697.jpg";