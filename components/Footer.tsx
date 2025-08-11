export default function Footer() {
  return (
    <footer className="bg-white shadow-inner border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600">
        <p className="mb-2 sm:mb-0">
          © {new Date().getFullYear()} <span className="font-semibold">AccountingApp</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
