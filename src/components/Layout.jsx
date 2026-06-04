import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <Outlet /> {/* Aquí aparecerá el Dashboard o el Inventario */}
      </main>
    </div>
  );
}

export default Layout;