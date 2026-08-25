import {getCurrentUser} from "@/lib/actions/user.actions";
import SettingsContent from "@/components/SettingsContent";
import {FileViewProvider} from "@/components/FileViewProvider";
import {redirect} from "next/navigation";
import { getDictionary, type Locale } from "@/lib/get-dictionary";

const SettingsPage = async ({ params }: { params: Promise<{ lang: string }> }) => {
    const { lang } = await params;
    const dictionary = await getDictionary(lang as Locale);
    const currentUser = await getCurrentUser();

    if (!currentUser) return redirect(`/${lang}/sign-in`);

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <h1 className="h1 capitalize">{dictionary.settings.title}</h1>
                </section>

                <SettingsContent {...currentUser} />
            </div>
        </FileViewProvider>
    )
};

export default SettingsPage;
