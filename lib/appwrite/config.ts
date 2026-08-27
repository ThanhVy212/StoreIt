export const appwriteConfig = {
    endpointUrl: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
    usersTableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
    filesTableId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
    foldersTableId: process.env.NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION!,
    fileLinksTableId: process.env.NEXT_PUBLIC_APPWRITE_FILE_LINKS_COLLECTION!,
    bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
    secretKey: process.env.NEXT_APPWRITE_SECRET!,
}