import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Loader2, PhoneOutgoing } from 'lucide-react';

const EditableField = ({ initialValue, onSave, fieldName, orderId, isDuplicatePhone }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

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
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
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
            onClick={() => setIsEditing(true)} 
            className={`group relative cursor-pointer min-h-[20px] rounded hover:bg-white/5 dark:hover:bg-white/10 p-1 -m-1 transition-colors flex items-center justify-between ${isDuplicatePhone ? 'text-red-400' : ''}`}
        >
            <span>{value || <span className="text-muted-foreground/50">N/A</span>}</span>
            <div className="flex items-center">
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
                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </div>
    );
};

export default EditableField;