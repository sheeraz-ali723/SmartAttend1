import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    description: "",
  });

  // ======================================================
  // FETCH DATA
  // ======================================================

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/classes`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch classes."
        );
      }

      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch classes error:", error);

      alert(
        error.message || "Unable to load classes."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/students`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch students."
        );
      }

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Fetch students error:",
        error
      );

      setStudents([]);
    }
  };

  // ======================================================
  // STUDENT COUNT
  // ======================================================

  const getStudentCount = (className) => {
    return students.filter(
      (student) =>
        student.className === className
    ).length;
  };

  // ======================================================
  // ADD CLASS
  // ======================================================

  const openAddModal = () => {
    setEditingClass(null);

    setFormData({
      name: "",
      department: "",
      description: "",
    });

    setIsModalOpen(true);
  };

  // ======================================================
  // EDIT CLASS
  // ======================================================

  const openEditModal = (classItem) => {
    setEditingClass(classItem);

    setFormData({
      name: classItem.name || "",
      department: classItem.department || "",
      description: classItem.description || "",
    });

    setIsModalOpen(true);
  };

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setEditingClass(null);

    setFormData({
      name: "",
      department: "",
      description: "",
    });
  };

  // ======================================================
  // HANDLE INPUT
  // ======================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // CREATE / UPDATE CLASS
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const department = formData.department.trim();
    const description = formData.description.trim();

    if (!name) {
      alert("Please enter a class name.");
      return;
    }

    if (!department) {
      alert("Please enter a department.");
      return;
    }

    try {
      setSaving(true);

      // ==================================================
      // UPDATE EXISTING CLASS
      // ==================================================

      if (editingClass) {
        const response = await fetch(
          `${API_URL}/api/classes/${editingClass._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              department,
              description,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update class."
          );
        }

        // Update class list
        setClasses((previousClasses) =>
          previousClasses.map((item) =>
            item._id === editingClass._id
              ? data.class
              : item
          )
        );

        // Important:
        // Backend automatically updates students
        // if the class name changes.
        await fetchStudents();

        alert("Class updated successfully.");

        closeModal();

        return;
      }

      // ==================================================
      // CREATE NEW CLASS
      // ==================================================

      const response = await fetch(
        `${API_URL}/api/classes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            department,
            description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create class."
        );
      }

      setClasses((previousClasses) => [
        ...previousClasses,
        data.class,
      ]);

      alert("Class created successfully.");

      closeModal();
    } catch (error) {
      console.error(
        "Save class error:",
        error
      );

      alert(
        error.message ||
          "Failed to save class."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // DELETE CLASS
  // ======================================================

  const deleteClass = async (classItem) => {
    const studentCount = getStudentCount(
      classItem.name
    );

    if (studentCount > 0) {
      alert(
        `Cannot delete "${classItem.name}" because ${studentCount} student(s) belong to this class. Move the students to another class first.`
      );

      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${classItem.name}"?`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/classes/${classItem._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete class."
        );
      }

      setClasses((previousClasses) =>
        previousClasses.filter(
          (item) =>
            item._id !== classItem._id
        )
      );

      alert("Class deleted successfully.");
    } catch (error) {
      console.error(
        "Delete class error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete class."
      );
    }
  };

  // ======================================================
  // SEARCH
  // ======================================================

  const filteredClasses = classes.filter(
    (classItem) => {
      const search =
        searchTerm.toLowerCase().trim();

      if (!search) return true;

      return (
        classItem.name
          ?.toLowerCase()
          .includes(search) ||
        classItem.department
          ?.toLowerCase()
          .includes(search) ||
        classItem.description
          ?.toLowerCase()
          .includes(search)
      );
    }
  );

  // ======================================================
  // ACTIVE CLASSES
  // ======================================================

  const activeClasses = classes.filter(
    (classItem) =>
      getStudentCount(classItem.name) > 0
  ).length;

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-100">
      <main className="w-full p-4 sm:p-6">
        <div className="mx-auto w-full max-w-7xl">

          {/* ============================================
              HEADER
          ============================================ */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Classes
              </h1>

              <p className="mt-1 text-gray-500">
                Manage classes and student groups
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 sm:w-auto"
            >
              + Add Class
            </button>
          </div>

          {/* ============================================
              STAT CARDS
          ============================================ */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* TOTAL CLASSES */}

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Classes
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-800">
                {classes.length}
              </p>
            </div>

            {/* TOTAL STUDENTS */}

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Students
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-800">
                {students.length}
              </p>
            </div>

            {/* ACTIVE CLASSES */}

            <div className="rounded-xl bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-gray-500">
                Active Classes
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-600">
                {activeClasses}
              </p>
            </div>
          </div>

          {/* ============================================
              SEARCH
          ============================================ */}

          <div className="mb-6 w-full rounded-xl bg-white p-4 shadow-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search by class name, department or description..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ============================================
              CLASS TABLE
          ============================================ */}

          <div className="w-full overflow-hidden rounded-xl bg-white shadow-sm">

            {loading ? (
              <div className="py-12 text-center text-gray-500">
                Loading classes...
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="py-12 text-center">

                <p className="font-medium text-gray-700">
                  {searchTerm
                    ? "No classes found."
                    : "No classes available."}
                </p>

                {!searchTerm && (
                  <p className="mt-1 text-sm text-gray-500">
                    Click "Add Class" to create your
                    first class.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full overflow-x-auto">

                <table className="min-w-[850px] w-full">

                  {/* TABLE HEADER */}

                  <thead className="border-b bg-gray-50">
                    <tr>

                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Class
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Department
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Description
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Students
                      </th>

                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  {/* TABLE BODY */}

                  <tbody>

                    {filteredClasses.map(
                      (classItem) => {
                        const studentCount =
                          getStudentCount(
                            classItem.name
                          );

                        return (
                          <tr
                            key={classItem._id}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >

                            {/* CLASS */}

                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-800">
                                {classItem.name}
                              </p>
                            </td>

                            {/* DEPARTMENT */}

                            <td className="px-6 py-4">
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                                {classItem.department}
                              </span>
                            </td>

                            {/* DESCRIPTION */}

                            <td className="max-w-[300px] px-6 py-4">
                              <p className="truncate text-sm text-gray-600">
                                {classItem.description ||
                                  "No description"}
                              </p>
                            </td>

                            {/* STUDENT COUNT */}

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                  studentCount > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {studentCount}{" "}
                                {studentCount === 1
                                  ? "Student"
                                  : "Students"}
                              </span>
                            </td>

                            {/* ACTIONS */}

                            <td className="px-6 py-4">
                              <div className="flex gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(
                                      classItem
                                    )
                                  }
                                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteClass(
                                      classItem
                                    )
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                    studentCount > 0
                                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                      : "bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  Delete
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* ================================================
          ADD / EDIT CLASS MODAL
      ================================================ */}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

          <div className="my-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">

            {/* MODAL HEADER */}

            <div className="border-b p-6">

              <h2 className="text-xl font-bold text-gray-800">
                {editingClass
                  ? "Edit Class"
                  : "Add Class"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {editingClass
                  ? "Update class information"
                  : "Create a new class"}
              </p>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >

              <div className="space-y-5">

                {/* CLASS NAME */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Class Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. BSCS 5A"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* DEPARTMENT */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Department
                  </label>

                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Computer Science"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="e.g. Section A"
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full rounded-lg bg-gray-100 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving
                    ? "Saving..."
                    : editingClass
                    ? "Update Class"
                    : "Add Class"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </div>
  );
};

export default Classes;