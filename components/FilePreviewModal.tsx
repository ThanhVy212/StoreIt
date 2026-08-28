'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useFilePreview } from '@/components/FilePreviewProvider';
import { constructDownloadUrl, convertFileSize, getFileProxyUrl } from '@/lib/utils';
import { useLocale } from '@/lib/locale-context';
import FormattedDateTime from '@/components/FormattedDateTime';

const FilePreviewModal = () => {
    const { previewFile, previewFiles, closePreview, goNext, goPrev, currentIndex, totalCount, isOpen } = useFilePreview();
    const { dictionary: t } = useLocale();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight' || e.key === 'Right') {
                goNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                goPrev();
            } else if (e.key === 'Escape') {
                closePreview();
            }
        },
        [isOpen, goNext, goPrev, closePreview]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !previewFile) return null;

    const fileUrl = getFileProxyUrl(previewFile.url);
    const downloadUrl = constructDownloadUrl(previewFile.bucketFileId);
    const fileType = previewFile.type;
    const extension = previewFile.extension?.toLowerCase() || '';

    const unsupportedFallback = (
        <div className="file-preview-unsupported">
            <Image
                src="/assets/icons/file-other.svg"
                alt="file"
                width={80}
                height={80}
            />
            <p className="subtitle-1 mt-4 text-white">{previewFile.name}</p>
            <p className="body-2 text-white/60">
                {t.preview?.cannotPreview || 'Preview not available for this file type'}
            </p>
            <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn mt-4 inline-flex items-center gap-2 px-6 py-2"
            >
                <Image src="/assets/icons/download.svg" alt="download" width={20} height={20} />
                {t.common.download}
            </a>
        </div>
    );

    const renderPreview = () => {
        switch (fileType) {
            case 'image':
                return (
                    <div className="file-preview-image-container">
                        <img
                            src={fileUrl}
                            alt={previewFile.name}
                            className="file-preview-image"
                        />
                    </div>
                );

            case 'video':
                return (
                    <div className="file-preview-video-container">
                        <video
                            src={fileUrl}
                            controls
                            className="file-preview-video"
                            autoPlay
                        >
                            Your browser does not support video playback.
                        </video>
                    </div>
                );

            case 'document':
                if (extension === 'pdf') {
                    return (
                        <div className="file-preview-pdf-container">
                            <iframe
                                src={fileUrl}
                                className="file-preview-pdf"
                                title={previewFile.name}
                            />
                        </div>
                    );
                }
                return (
                    <div className="file-preview-unsupported">
                        <Image
                            src="/assets/icons/file-doc.svg"
                            alt="document"
                            width={80}
                            height={80}
                        />
                        <p className="subtitle-1 mt-4 text-white">{previewFile.name}</p>
                        <p className="body-2 text-white/60">
                            {t.preview?.cannotPreview || 'Preview not available for this file type'}
                        </p>
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="primary-btn mt-4 inline-flex items-center gap-2 px-6 py-2"
                        >
                            <Image src="/assets/icons/download.svg" alt="download" width={20} height={20} />
                            {t.common.download}
                        </a>
                    </div>
                );

            default:
                if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
                    return (
                        <div className="file-preview-audio-container">
                            <div className="file-preview-audio-icon">
                                <Image
                                    src="/assets/icons/file-audio.svg"
                                    alt="audio"
                                    width={80}
                                    height={80}
                                />
                            </div>
                            <p className="subtitle-2 mt-4 mb-2 text-white">{previewFile.name}</p>
                            <audio src={fileUrl} controls autoPlay className="file-preview-audio">
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    );
                }
                return unsupportedFallback;
        }
    };

    return (
        <div className="file-preview-overlay" onClick={closePreview}>
            <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="file-preview-header">
                    <div className="file-preview-info">
                        <p className="subtitle-2 line-clamp-1 text-white">{previewFile.name}</p>
                        <div className="caption text-white/60 flex items-center gap-1">
                            {previewFile.size != null ? convertFileSize(previewFile.size) : ''}
                            {previewFile.size != null && <span>·</span>}
                            <FormattedDateTime date={previewFile.$createdAt} />
                        </div>
                    </div>

                    <div className="file-preview-actions">
                        <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-preview-action-btn"
                            title={t.common.download}
                        >
                            <Image src="/assets/icons/download.svg" alt="download" width={20} height={20} />
                        </a>
                        <button
                            onClick={closePreview}
                            className="file-preview-action-btn"
                            title={t.common.close}
                        >
                            <Image src="/assets/icons/close.svg" alt="close" width={20} height={20} />
                        </button>
                    </div>
                </div>

                <div className="file-preview-body">
                    {totalCount > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            disabled={currentIndex <= 0}
                            className="file-preview-nav-btn file-preview-nav-prev"
                            title={t.preview?.previous || 'Previous'}
                        >
                            <Image src="/assets/icons/chevron-left.svg" alt="prev" width={24} height={24} />
                        </button>
                    )}

                    <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
                        {renderPreview()}
                    </div>

                    {totalCount > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            disabled={currentIndex >= totalCount - 1}
                            className="file-preview-nav-btn file-preview-nav-next"
                            title={t.preview?.next || 'Next'}
                        >
                            <Image src="/assets/icons/chevron-right.svg" alt="next" width={24} height={24} />
                        </button>
                    )}
                </div>

                {totalCount > 1 && (
                    <div className="file-preview-footer">
                        <p className="caption text-white/60">
                            {(t.preview?.position || '{current} / {total}')
                                .replace('{current}', String(currentIndex + 1))
                                .replace('{total}', String(totalCount))}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilePreviewModal;
