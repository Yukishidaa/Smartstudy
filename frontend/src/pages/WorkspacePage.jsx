/**
 * WorkspacePage — точка входа для маршрута /workspace.
 * Делегирует весь рендер модулю WorkspaceModule из папки Modules/Workspace.
 */
import WorkspaceModule from '../Modules/Workspace/WorkspaceModule';

function WorkspacePage() {
    return <WorkspaceModule />;
}

export default WorkspacePage;
