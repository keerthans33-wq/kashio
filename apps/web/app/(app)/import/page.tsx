import CsvUploader from "../../components/import/CsvUploader";

export default function Import() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Import</h1>
      <p className="mt-3 text-gray-500 dark:text-gray-400">
        Upload a CSV file exported from your bank to get started.
      </p>
      <CsvUploader />
    </main>
  );
}
