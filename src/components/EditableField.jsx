
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Loader2, PhoneOutgoing } from 'lucide-react';

const EditableField = ({ initialValue, onSave, fieldName, orderId, isDuplicatePhone, disabled = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (value === initialValue) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            const fieldParts = fieldName.split('.');
            let updateData;
            if (fieldParts.length > 1) {
                updateData = { [fieldParts[0]]: { [fieldParts[1]]: value } };
            } else {
                updateData = { [fieldName]: value };
            }

            await onSave(orderId, updateData);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save field:", error);
            setValue(initialValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
        if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    };

    const handleWhatsAppClick = (e) => {
        e.stopPropagation();
        if (value) {
            const cleanedPhone = ('' + value).replace(/\D/g, '');
            window.open(`https://wa.me/${cleanedPhone}`, '_blank', 'noopener,noreferrer');
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <Input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="h-7 text-xs bg-input/50"
                    disabled={isSaving}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-400" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="h-3 w-3 text-red-400" />
                </Button>
            </div>
        );
    }

    return (
        <div
            onClick={() => !disabled && !['billing.phone', 'mobile'].includes(fieldName) && setIsEditing(true)}
            className={`${!value || value.trim === 'N/A' ? 'hidden' : ''} group relative rounded p-1 -m-1 transition-colors flex items-center justify-between ${!disabled ? 'cursor-pointer hover:bg-white/5 dark:hover:bg-white/10' : 'cursor-not-allowed'} ${isDuplicatePhone ? 'text-red-400' : ''}`}
            title={fieldName}
        >
            <span className="min-h-[20px] flex items-center">{value || <span className="text-muted-foreground/50">N/A</span>}</span>
            <div className="flex items-center">
                {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <>
                        {(fieldName === 'billing.phone' || fieldName === 'mobile') && value && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={handleWhatsAppClick}
                                title="Open in WhatsApp"
                            >
                                <PhoneOutgoing className="h-3 w-3 text-green-400" />
                            </Button>
                        )}
                        {!disabled && !['billing.phone', 'mobile'].includes(fieldName) && <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </>
                )}
            </div>
        </div>
    );
};

export default EditableField;
