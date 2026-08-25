import Image from "next/image";
import { getDictionary, type Locale } from "@/lib/get-dictionary";

const Layout = async ({children, params}: {children: React.ReactNode; params: Promise<{ lang: string }>}) => {
    const { lang } = await params;
    const t = await getDictionary(lang as Locale);

    return (
        <div className="flex min-h-screen">
            <section className="bg-brand p-10 hidden w-1/2 items-center justify-center lg:flex xl:w-2/5">
                <div className="flex max-h-[800px] m-w-[430px] flex-col justify-center space-y-12">
                    <Image
                        src="/assets/icons/logo-full.svg"
                        alt="logo"
                        width={224}
                        height={82}
                        className="h-auto"
                    />

                    <div className="space-y-5 text-white">
                        <h1 className="h1">{t.auth.brandTitle}</h1>
                        <p className="body-1">
                            {t.auth.brandDescription}
                        </p>
                    </div>

                    <Image
                        src="/assets/images/files.png"
                        alt="Files"
                        width={342}
                        height={342}
                        className="transition-all hover:rotate-2 hover:scale-105"
                    />
                </div>
            </section>

            <section className="flex flex-1 flex-col items-center bg-white p-4 py-10 lg:justify-center lg:p-10 lg:py-0">
                <div className="mb-16 lg:hidden">
                        <Image
                            src="/assets/icons/logo-full-brand.svg"
                            alt="logo"
                            width={224}
                            height={82}
                            className="h-auto w-[200px] lg:w-[250px]"

                        />
                </div>

                {children}
            </section>
        </div>
    )
}
export default Layout
