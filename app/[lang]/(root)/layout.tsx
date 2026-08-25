import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import Header from "@/components/Header";
import {getCurrentUser} from "@/lib/actions/user.actions";
import {redirect} from "next/navigation";

const Layout = async ({children, params}: {children: React.ReactNode; params: Promise<{ lang: string }>}) => {
    const { lang } = await params;
    const currentUser = await getCurrentUser();

    if(!currentUser) return redirect(`/${lang}/sign-in`);

    return (
        <main className="flex h-screen">
            <Sidebar {...currentUser} />
            <section className="flex h-full min-h-0 flex-1 flex-col">
                <MobileNavigation {...currentUser} />
                <Header userId={currentUser.$id} accountId={currentUser.accountId} />
                <div className="main-content">{children}</div>
            </section>
        </main>
    )
}
export default Layout
