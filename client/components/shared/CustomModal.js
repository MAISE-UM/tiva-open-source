import React from 'react';
import {maxWidth} from "@/components/shared/General";
import ModalInformational from "@/components/shared/ModalInformational";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";


const loadingGraphicStyle = {
	position: 'absolute'
	, zIndex: '2'
	, left: '45%'
	//, height: '100%'
	//, width: '375px'
	, color: 'orange'
	, backgroundColor: 'gray'
};

function CustomModal(props) {
	const {
		apiCallResult = {}
		, footerContent
		, headerStyle
		, loading
		, modalStyle = maxWidth.nineHundred
		, modalBodyStyle = {}
	} = props;
	const {
		bodyText
		, headerText
		, status: informationalStatus
		, isInformationalModalOpen
	} = apiCallResult;

	return (
		<Dialog
			open={true}
			style={modalStyle}
		>
			<DialogContent>
				{
					loading &&
					<div
						className='ref-loading-graphic'
						style={loadingGraphicStyle}
					>
						<div className="flex justify-center items-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
						</div>
					</div>
				}
				{
					isInformationalModalOpen &&
					<ModalInformational
						status={informationalStatus}
						headerText={headerText}
						bodyText={bodyText}
					/>
				}
				<DialogHeader style={headerStyle}>
					<DialogTitle>{props.headerContent}</DialogTitle>
				</DialogHeader>
				<DialogDescription style={modalBodyStyle}>
					<div
						style={flexDirections.column}
					>
						{props.bodyContent}
					</div>
				</DialogDescription>
				{
					footerContent &&
					<DialogFooter>
						{props.footerContent}
					</DialogFooter>
				}
			</DialogContent>
		</Dialog>
	);
}

export default CustomModal;