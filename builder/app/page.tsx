import { Header } from "./components/Header";
import { ChatInterface } from "./components/ChatInterface";
import { Workspace } from "./components/Workspace";
import { FileExplorer } from "./components/FileExplorer";
import { StarField } from "./components/StarField";

export default function Home() {
  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-black">
      {/* Ambient orbs */}
      <div className="orb orb-purple" />
      <div className="orb orb-cyan" />

      {/* Starfield */}
      <StarField />

      {/* UI above stars */}
      <div className="relative z-10 flex h-full flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <FileExplorer />
          <ChatInterface />
          <Workspace />
        </div>
      </div>
    </main>
  );
}
