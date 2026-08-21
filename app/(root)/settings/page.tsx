import {getCurrentUser} from "@/lib/actions/user.actions";
import SettingsContent from "@/components/SettingsContent";
import {FileViewProvider} from "@/components/FileViewProvider";

const SettingsPage = async () => {
    const currentUser = await getCurrentUser();

    return (
        <FileViewProvider>
            <div className="page-container">
                <section className="w-full shrink-0">
                    <h1 className="h1 capitalize">Settings</h1>
                </section>

                <SettingsContent {...currentUser} />
            </div>
        </FileViewProvider>
    )
};

export default SettingsPage;