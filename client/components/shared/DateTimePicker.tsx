import Datetime from "react-datetime";
import { useEffect, useRef, useState } from "react";
import { Moment } from "moment/moment";

interface DateTimePickerProps {
    disabled?: boolean;
    value: Date;
    onChange: (date: string | Moment | FocusEvent) => void;
}

export function DateTimePicker(props: DateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const localValueRef = useRef<Date | Moment | string>(props.value);
    const valueDate = props.value.getDate();
    const currentDate = new Date().getDate();

    useEffect(() => {
        localValueRef.current = props.value;
    }, [props.value]);

    useEffect(() => {
        if (open) {
            console.log("scroll");
            window.scrollBy(0, 180);
        }
    }, [open]);

    return (
        <div style={open ? { height: "180px" } : {}} className={`flex px-3 py-2 border rounded-md bg-white text-sm ${props.disabled ? "cursor-not-allowed opacity-50" : ""}`}>
            <Datetime
                key={props.value.getTime()}
                initialValue={props.value}
                initialViewMode={"time"}
                inputProps={{ disabled: props.disabled }}
                dateFormat={valueDate !== currentDate || open ? "MM/DD/YYYY" : ""}
                onChange={(value) => {
                    localValueRef.current = value as Date | Moment | string;
                }}
                onOpen={() => {
                    setOpen(true)
                }}
                onClose={() => {
                    setOpen(false);
                    props.onChange(localValueRef.current as string | Moment | FocusEvent);
                }}
            />
        </div>
    );
}
 