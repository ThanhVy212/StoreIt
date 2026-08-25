export const navItems = [
    {
        name: 'Dashboard',
        key: 'dashboard',
        icon: '/assets/icons/dashboard.svg',
        url: '/',
    },
    {
        name: 'Folders',
        key: 'folders',
        icon: '/assets/icons/folder.svg',
        url: '/folders',
    },
    {
        name: 'Images',
        key: 'images',
        icon: '/assets/icons/images.svg',
        url: '/images',
    },
    {
        name: 'Video',
        key: 'video',
        icon: '/assets/icons/video.svg',
        url: '/video',
    },
    {
        name: 'Documents',
        key: 'documents',
        icon: '/assets/icons/documents.svg',
        url: '/documents',
    },
    {
        name: 'Others',
        key: 'others',
        icon: '/assets/icons/others.svg',
        url: '/others',
    },
    {
        name: 'Trash',
        key: 'trash',
        icon: '/assets/icons/trash.svg',
        url: '/trash',
    },
    {
        name: 'Settings',
        key: 'settings',
        icon: '/assets/icons/setting.svg',
        url: '/settings',
    },
];

export const actionsDropdownItems = [
    {
        label: 'Rename',
        key: 'rename',
        icon: '/assets/icons/edit.svg',
        value: 'rename',
    },
    {
        label: 'Details',
        key: 'details',
        icon: '/assets/icons/info.svg',
        value: 'details',
    },
    {
        label: 'Share',
        key: 'share',
        icon: '/assets/icons/share.svg',
        value: 'share',
    },
    {
        label: 'Download',
        key: 'download',
        icon: '/assets/icons/download.svg',
        value: 'download',
    },
    {
        label: 'Move to trash',
        key: 'moveToTrash',
        icon: '/assets/icons/delete.svg',
        value: 'trash',
    },
];

export const sharedActionsDropdownItems = [
    {
        label: 'Details',
        key: 'details',
        icon: '/assets/icons/info.svg',
        value: 'details',
    },
    {
        label: 'Download',
        key: 'download',
        icon: '/assets/icons/download.svg',
        value: 'download',
    },
    {
        label: 'Unshare',
        key: 'unshare',
        icon: '/assets/icons/unshare.svg',
        value: 'unshare',
    },
];

export const trashActionsDropdownItems = [
    {
        label: 'Restore',
        key: 'restore',
        icon: '/assets/icons/restore.svg',
        value: 'restore',
    },
    {
        label: 'Details',
        key: 'details',
        icon: '/assets/icons/info.svg',
        value: 'details',
    },
    {
        label: 'Delete',
        key: 'delete',
        icon: '/assets/icons/delete.svg',
        value: 'delete',
    },
];

export const sortTypes = [
    {
        label: 'Date created (newest)',
        key: 'dateCreatedNewest',
        value: '$createdAt-desc',
    },
    {
        label: 'Created Date (oldest)',
        key: 'dateCreatedOldest',
        value: '$createdAt-asc',
    },
    {
        label: 'Name (A-Z)',
        key: 'nameAZ',
        value: 'name-asc',
    },
    {
        label: 'Name (Z-A)',
        key: 'nameZA',
        value: 'name-desc',
    },
    {
        label: 'Size (Highest)',
        key: 'sizeHighest',
        value: 'size-desc',
    },
    {
        label: 'Size (Lowest)',
        key: 'sizeLowest',
        value: 'size-asc',
    },
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const avatarPlaceholderUrl = "https://png.pngtree.com/png-vector/20210604/ourmid/pngtree-gray-avatar-placeholder-png-image_3416697.jpg";
