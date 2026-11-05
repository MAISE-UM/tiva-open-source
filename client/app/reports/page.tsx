'use client'

import { useEffect, useState } from "react";
import { useLayoutToggle } from "@/app/hooks/useLayoutToggle";
import { usePermissions } from "@/app/contexts/PermissionContext";
import { getUserReportRows } from "@/api/report-api";
import { UserReportRow } from "@/app/utils/interfaces";
import ExcelJS from "exceljs";

type ReportOption = 'Internal User Report' | 'External User Report';

export default function UserReport() {
    useLayoutToggle(true, true);
    const { permissions, userPayload } = usePermissions();
    
    const [option, setOption] = useState<ReportOption>('Internal User Report');
    const [component, setReportComponent] = useState(<InternalReport />);

    const reportMapping = {
        "Internal User Report": <InternalReport />,
        "External User Report": <ExternalReport />
    };

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setOption(event.target.value as ReportOption);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setReportComponent(reportMapping[option]);
    };

    useEffect(() => {
        console.log('userPermissions', permissions, userPayload);
    }, [permissions, userPayload]);

    return (
        <div className="min-h-[90vh] bg-slate-50 flex flex-col">
            <div className="view-content flex-1">
                <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                    {/* Top filter card */}
                    <form 
                        onSubmit={handleSubmit}
                        className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
                    >
                        <div className="w-full md:w-auto space-y-2">
                            <label 
                                htmlFor="reportType"
                                className="block text-xs font-semibold tracking-wide text-slate-600 uppercase"
                            >
                                Report Type
                            </label>
                            <select
                                id="reportType"
                                className="block w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={option}
                                onChange={handleChange}
                            >
                                <option value="Internal User Report">
                                    Internal Login Report
                                </option>
                                <option value="External User Report">
                                    External User Report
                                </option>
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <input
                                type="submit"
                                value="View Report"
                                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                            />
                        </div>
                    </form>

                    {/* Title */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                            {option}
                        </h1>
                    </div>

                    {/* Report card */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-4 md:px-6 md:py-6">
                        {component}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InternalReport() {
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<UserReportRow[]>([]);
    const [frequency, setFrequency] = useState<'D' | 'M'>('D');
    const [totalPages, setTotalPages] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const rowsPerPage = 10;

    const fetchData = async (currentPage: number) => {
        setLoading(true);
        const data = await getUserReportRows({
            P_DateFrequency: frequency,
            P_PageNumber: currentPage
        });
        const users = data.oReturnObject ?? [];
        setRows(users);

        const totalRecords = Number(users[0]?.TotalRows) || 0;
        setTotalPages(Math.ceil(totalRecords / rowsPerPage) || 1);
        setLoading(false);
    };

    const handleFrequencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setPage(1);
        setFrequency(event.target.value as 'D' | 'M');
    };

    const downloadExcel = async () => {
        let allRowsNew: UserReportRow[] = [];
        
        for (let p = 1; p <= totalPages; p++) {
            const data = await getUserReportRows({
                P_DateFrequency: frequency,
                P_PageNumber: p
            });
            const pageRows = data.oReturnObject ?? [];  
            allRowsNew = [...allRowsNew, ...pageRows];
        }
        
        const filtered = allRowsNew.map(({ TotalRows, ...rest }) => rest);

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("User Login Data");
        if (filtered.length > 0) {
            ws.columns = Object.keys(filtered[0]).map(key => ({ header: key, key }));
            filtered.forEach(row => ws.addRow(row));
        }
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "user_login_data.xlsx";
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        fetchData(page);
    }, [page, frequency]);

    return (
        <div className="space-y-4">
            {/* Toolbar: frequency + actions + pagination */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Left: frequency + info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">Filters</span>
                        <span className="hidden md:inline-block h-4 w-px bg-slate-200" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="frequency" className="text-xs uppercase tracking-wide text-slate-500">
                            Frequency
                        </label>
                        <select
                            id="frequency"
                            value={frequency}
                            onChange={handleFrequencyChange}
                            className="border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="D">Day</option>
                            <option value="M">Month</option>
                        </select>
                    </div>
                </div>

                {/* Right: actions + pagination */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 md:justify-end">
                    <button
                        onClick={downloadExcel}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs md:text-sm font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                        Download Excel
                    </button>

                    <div className="flex items-center justify-end gap-2 text-xs md:text-sm text-slate-600">
                        <button
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1.5 rounded-lg border text-xs md:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed border-slate-300 bg-white hover:bg-slate-50"
                        >
                            Previous
                        </button>
                        <span className="px-2 text-xs md:text-sm">
                            Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                            <span className="font-semibold text-slate-900">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={page === totalPages}
                            className="px-2.5 py-1.5 rounded-lg border text-xs md:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed border-slate-300 bg-white hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-2 font-semibold text-slate-700">First Name</th>
                            <th className="px-4 py-2 font-semibold text-slate-700">Last Name</th>
                            <th className="px-4 py-2 font-semibold text-slate-700">Unique Name</th>
                            <th className="px-4 py-2 font-semibold text-slate-700">Date</th>
                            <th className="px-4 py-2 font-semibold text-slate-700 text-right">Login Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    No results for this range.
                                </td>
                            </tr>
                        ) : (
                            rows.map((user, index) => (
                                <tr
                                    key={index}
                                    className="border-t border-slate-100 hover:bg-slate-50"
                                >
                                    <td className="px-4 py-2 text-slate-900">{user.First_Name}</td>
                                    <td className="px-4 py-2 text-slate-900">{user.Last_Name}</td>
                                    <td className="px-4 py-2 text-slate-700">{user.Username}</td>
                                    <td className="px-4 py-2 text-slate-700">
                                        {String(user.Login_Date).substring(0, 10)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-900">
                                        {user.Login_Count}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ExternalReport() {
    // Embedded report URL, e.g. an SSRS report with rs:embed=true
    const iFrameSource = process.env.NEXT_PUBLIC_EXTERNAL_REPORT_URL;

    if (!iFrameSource) {
        return (
            <p className="text-sm text-slate-500">
                External report is not configured (NEXT_PUBLIC_EXTERNAL_REPORT_URL).
            </p>
        );
    }

    return (
        <div className="w-full">
            <div className="w-full h-[60vh] border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                <iframe 
                    id="ifReport" 
                    title="External User Report"
                    width="100%" 
                    height="100%" 
                    src={iFrameSource}
                    className="border-0"
                />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                This embedded report is hosted on an external reporting server.
            </p>
        </div>
    );
}