import type React from "react"
import type { User } from "@/app/utils/interfaces"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, Pencil, Search, Trash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface UserTableProps {
    users: User[]
    sort: { column: "User_ID" | "Name" | "UserName" | "Roles"; ascending: boolean }
    setSort: React.Dispatch<
        React.SetStateAction<{ column: "User_ID" | "Name" | "UserName" | "Roles"; ascending: boolean }>
    >
    searchTermField: string
    setSearchTermField: React.Dispatch<React.SetStateAction<string>>
    setEditUserObj: React.Dispatch<React.SetStateAction<User>>
    toggleEditUserModal: () => void
    setUserToDelete: React.Dispatch<React.SetStateAction<User>>
    toggleDeleteModal: () => void
    isLoading: boolean
    currentPage: number
    setCurrentPageAction: React.Dispatch<React.SetStateAction<number>>
}

export const UserTable: React.FC<UserTableProps> = ({
    users,
    sort,
    setSort,
    searchTermField,
    setSearchTermField,
    setEditUserObj,
    toggleEditUserModal,
    setUserToDelete,
    toggleDeleteModal,
    isLoading,
    currentPage,
    setCurrentPageAction,
}) => {
    const toggleSort = (col: "User_ID" | "Name" | "UserName" | "Roles") => {
        setSort((prevSort) => ({
            column: col,
            ascending: prevSort.column === col ? !prevSort.ascending : true,
        }))
    }

    const getSortIcon = (col: "User_ID" | "Name" | "UserName" | "Roles") => {
        if (col !== sort.column) {
            return null
        }
        return sort.ascending ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )
    }

    // Pagination logic
    const ITEMS_PER_PAGE = 30
    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE)

    const paginatedUsers = users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const handlePageChange = (page: number) => {
        setCurrentPageAction(page)
    }

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPageAction(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPageAction(currentPage + 1)
        }
    }

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pageNumbers = []
        const maxPageButtons = 5 // Show at most 5 page buttons

        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2))
        const endPage = Math.min(totalPages, startPage + maxPageButtons - 1)

        // Adjust if we're near the end
        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i)
        }

        return pageNumbers
    }

    return (
        <div className="overflow-x-auto max-h-[calc(100vh-21rem)]">
            <div className="mb-4">
                <div className="relative">
                    <Input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search users..."
                        value={searchTermField}
                        onChange={(e) => setSearchTermField(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <table className="min-w-full divide-y divide-gray-200 ">
                        <thead className="bg-gray-50">
                        <tr>
                            {["User_ID", "Name", "UserName", "Roles", "Groups"].map((col) => (
                                <th
                                    key={col}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                    onClick={() => toggleSort(col as "User_ID" | "Name" | "UserName" | "Roles")}
                                >
                                    <div className="flex items-center">
                                        {col}
                                        {getSortIcon(col as "User_ID" | "Name" | "UserName" | "Roles")}
                                    </div>
                                </th>
                            ))}
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.map((user: User) => (
                            <tr key={user.User_ID} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.User_ID}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.First_Name + " " + user.Last_Name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.UserName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.Roles}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            className="text-blue-600 hover:text-blue-900"
                                            onClick={() => {
                                                setEditUserObj(user)
                                                toggleEditUserModal()
                                            }}
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </button>
                                        <button
                                            className="text-red-600 hover:text-red-900"
                                            onClick={() => {
                                                setUserToDelete(user)
                                                toggleDeleteModal()
                                            }}
                                        >
                                            <Trash className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <Button
                                    variant="outline"
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium"
                                >
                                    Next
                                </Button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                                        <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, users.length)}</span> of{" "}
                                        <span className="font-medium">{users.length}</span> users
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <Button
                                            variant="outline"
                                            onClick={handlePrevPage}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                                        </Button>

                                        {getPageNumbers().map((page) => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                onClick={() => handlePageChange(page)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                    currentPage === page
                                                        ? "bg-primary text-primary-foreground"
                                                        : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                                } focus:z-20 focus:outline-offset-0`}
                                            >
                                                {page}
                                            </Button>
                                        ))}

                                        <Button
                                            variant="outline"
                                            onClick={handleNextPage}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                                        </Button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

