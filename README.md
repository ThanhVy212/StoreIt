# 📦 StoreIt - Modern Cloud Storage & File Management Platform

A robust, full-stack cloud storage and file management web application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS**, and **Appwrite**. StoreIt allows users to seamlessly upload, organize, search, share, and manage various types of media and documents in a centralized dashboard.

---

## ✨ Features

- 🔐 **Passwordless Authentication**: Secure sign-in and sign-up with OTP (One-Time Password) verification sent directly to the user's email via Appwrite.
- 📊 **Dynamic Storage Dashboard**:
  - Real-time visualization of used storage vs. total available capacity.
  - Category breakdown for **Documents**, **Images**, **Videos**, **Audio**, and **Others**.
  - Quick list of recently uploaded files.
- 📁 **File Upload & Categorization**:
  - Drag-and-drop file uploader supporting multi-file uploads (up to 50MB per file).
  - Automated categorization based on MIME types and extensions.
  - Direct upload and streaming to Appwrite Storage buckets.
- 🔍 **Search & Filter**:
  - Global real-time debounced search bar.
  - Category-based navigation tabs.
  - Multi-criteria sorting: Date created (newest/oldest), Name (A-Z / Z-A), and Size (highest/lowest).
- ⚙️ **Comprehensive File Actions**:
  - **Rename**: Change file names on the fly.
  - **Details**: Inspect file size, owner, format, and last modified date.
  - **Share**: Grant file access to other users by email address.
  - **Download**: Instantly download files to local storage.
  - **Delete**: Safely remove files with confirmation modals.
- 📱 **Fully Responsive UI**: Modern, accessible interface styled with Tailwind CSS and Shadcn UI components, optimized for desktops, tablets, and mobile devices.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router & Server Actions) |
| **Frontend Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & [tw-animate-css](https://www.npmjs.com/package/tw-animate-css) |
| **UI Components** | [Shadcn UI](https://ui.shadcn.com/), [@base-ui/react](https://base-ui.com/), [Lucide React](https://lucide.dev/) |
| **Backend & Auth** | [Appwrite](https://appwrite.io/) ([node-appwrite SDK](https://github.com/appwrite/sdk-for-node)) |
| **Form Handling** | [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) |
| **File Handling** | [React Dropzone](https://react-dropzone.js.org/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |

---

## 📂 Project Structure

```text
├── app/
│   ├── (auth)/             # Authentication routes (sign-in, sign-up, layout)
│   ├── (root)/             # Protected application routes (dashboard, [type], layout)
│   ├── favicon.ico         # App favicon
│   ├── globals.css         # Global Tailwind CSS styles
│   └── layout.tsx          # Root layout
├── components/             # Reusable UI & business logic components
│   ├── ui/                 # Shadcn UI base components (dialog, dropdown, input, etc.)
│   ├── ActionDropdown.tsx  # File action dropdown menu (Rename, Share, Delete, etc.)
│   ├── ActionsModalContent.tsx # Modal dialogs for file operations
│   ├── AuthForm.tsx        # Authentication form for login and registration
│   ├── Chart.tsx           # Storage capacity visualization chart
│   ├── FileCard.tsx        # Card display for individual files
│   ├── FileUploader.tsx    # Drag-and-drop file upload component
│   ├── Header.tsx          # App header with search and user controls
│   ├── MobileNavigation.tsx# Mobile slide-out navigation
│   ├── OTPModal.tsx        # One-time passcode verification modal
│   ├── Search.tsx          # Debounced search bar
│   ├── Sidebar.tsx         # Desktop sidebar navigation
│   ├── Sort.tsx            # File sorting selector
│   └── Thumbnail.tsx       # File preview thumbnail component
├── constants/              # Application navigation items and sort configurations
├── lib/
│   ├── actions/            # Server actions for files and user management
│   ├── appwrite/           # Appwrite client configuration and session management
│   └── utils.ts            # Formatting, styling, and helper functions
├── types/                  # TypeScript definitions and interfaces
└── public/                 # Static assets (icons, images, illustrations)
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (version 18.x or later)
- [npm](https://www.npmjs.com/) / [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)
- An [Appwrite](https://cloud.appwrite.io/) Cloud account or self-hosted Appwrite instance

### 1. Clone the Repository

```bash
git clone https://github.com/ThanhVy212/StoreIt.git
cd StoreIt
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and configure your Appwrite credentials:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_APPWRITE_DATABASE="your_database_id"
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION="your_users_collection_id"
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION="your_files_collection_id"
NEXT_PUBLIC_APPWRITE_BUCKET="your_storage_bucket_id"
NEXT_APPWRITE_SECRET="your_secret_api_key"
```

### 4. Appwrite Setup Details

1. **Project**: Create a project in the Appwrite Console.
2. **Database**: Create a database (e.g., `storeit_db`).
3. **Collections**:
   - **Users Collection**: Stores registered user details (`fullName`, `email`, `avatar`, `accountId`).
   - **Files Collection**: Stores file records (`name`, `url`, `type`, `bucketFileId`, `accountId`, `extension`, `size`, `users` array for shared users).
4. **Storage Bucket**: Create a storage bucket for uploading files. Set appropriate file size limits and allowed file extensions.
5. **API Key**: Generate an API Key with `files`, `documents`, `users`, and `databases` scopes.

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore StoreIt!

---

## 📦 Scripts

- `npm run dev` - Starts the Next.js development server.
- `npm run build` - Builds the application for production.
- `npm run start` - Starts the production server.
- `npm run lint` - Runs ESLint to check for code quality and errors.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
