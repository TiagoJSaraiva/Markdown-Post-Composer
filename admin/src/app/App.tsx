import EditorPanel from "../features/editor/EditorPanel";
import FormPanel from "../features/form/FormPanel";
import PostPreviewPanel from "../features/preview/PostPreviewPanel";
import { AuthProvider } from "../auth/AuthProvider";
import AuthGate from "../auth/AuthGate";
import ConfigErrorScreen from "../config/ConfigErrorScreen";
import { configResult } from "../config/env";
import { PostDraftProvider } from "./postDraft/PostDraftProvider";
import "./App.css";

function App() {
  if (!configResult.ok) {
    return <ConfigErrorScreen result={configResult} />;
  }

  // The draft provider sits above the gate so a lock (manual or after a 401)
  // does not lose the post being edited.
  return (
    <PostDraftProvider>
      <AuthProvider>
        <AuthGate>
          <div className="app">
            <div className="app-container">
              <EditorPanel />
              <FormPanel />
              <PostPreviewPanel />
            </div>
            <div id="app-modal-root"></div>
          </div>
        </AuthGate>
      </AuthProvider>
    </PostDraftProvider>
  );
}

export default App;
