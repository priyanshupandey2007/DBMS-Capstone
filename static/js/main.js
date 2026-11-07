// Smart Employee Management System Client Helper
document.addEventListener('DOMContentLoaded', () => {
  // Mobile sidebar toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Collapsible SQL code toggles
  document.querySelectorAll('.sql-box-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      if (body) {
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  // Auto-dismiss alerts after 5 seconds
  setTimeout(() => {
    document.querySelectorAll('.flash-message').forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s ease';
      setTimeout(() => el.remove(), 500);
    });
  }, 5000);
});

// Confirmation helper for deletes
function confirmDelete(message) {
  return confirm(message || 'Are you sure you want to delete this record? This action cannot be undone.');
}

