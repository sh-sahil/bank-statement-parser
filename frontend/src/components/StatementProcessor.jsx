import React, { useState } from "react";

const StatementProcessor = () => {
  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [label, setLabel] = useState("");

  const itemsPerPage = 50;
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const handleFileChange = e => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bank", "saraswat");

    try {
      const response = await fetch("http://localhost:5000/api/process-statement", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTransactions(data.transactions);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelUpdate = async () => {
    if (!selectedTransaction || !label) return;

    try {
      await fetch("http://localhost:5000/api/update-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          label,
        }),
      });

      // Update local state
      const updatedTransactions = transactions.map(t =>
        t === selectedTransaction ? { ...t, label } : t
      );
      setTransactions(updatedTransactions);
      setShowModal(false);
      setSelectedTransaction(null);
      setLabel("");
    } catch (err) {
      setError("Failed to update label");
    }
  };

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return transactions.slice(start, end);
  };

  const openModal = transaction => {
    setSelectedTransaction(transaction);
    setLabel(transaction.label || "");
    setShowModal(true);
  };

  // Format amount to handle null/undefined values
  const formatAmount = amount => {
    if (amount === null || amount === undefined) return "-";
    return amount.toString();
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Bank Statement Processor</h1>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
          >
            {loading ? "Processing..." : "Upload"}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left border">Date</th>
                <th className="p-2 text-left border">Particulars</th>
                <th className="p-2 text-left border">Instruments</th>
                <th className="p-2 text-right border">Dr Amount</th>
                <th className="p-2 text-right border">Cr Amount</th>
                <th className="p-2 text-right border">Total Amount</th>
                <th className="p-2 text-center border">Label</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageData().map((transaction, index) => (
                <tr
                  key={index}
                  onClick={() => openModal(transaction)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-2 border">{transaction.Date || "-"}</td>
                  <td className="p-2 border">{transaction.Particulars || "-"}</td>
                  <td className="p-2 border">{transaction.Instruments || "-"}</td>
                  <td className="p-2 border text-right">
                    {formatAmount(transaction["Dr Amount"])}
                  </td>
                  <td className="p-2 border text-right">
                    {formatAmount(transaction["Cr Amount"])}
                  </td>
                  <td className="p-2 border text-right">
                    {formatAmount(transaction["Total Amount"])}
                  </td>
                  <td className="p-2 border text-center">{transaction.label || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Label</h2>
            <div className="mb-4">
              <p className="font-medium">Transaction Details:</p>
              <p>Date: {selectedTransaction?.Date || "-"}</p>
              <p>Particulars: {selectedTransaction?.Particulars || "-"}</p>
              <p>Dr Amount: {formatAmount(selectedTransaction?.["Dr Amount"])}</p>
              <p>Cr Amount: {formatAmount(selectedTransaction?.["Cr Amount"])}</p>
            </div>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Enter label"
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLabelUpdate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementProcessor;
