import Image from "next/image";

export const repositoryUrl = "https://github.com/ReasonW6/what-ui-guide";

export function GitHubLink() {
  return (
    <a
      aria-label="在 GitHub 查看项目（新窗口）"
      className="github-link"
      href={repositoryUrl}
      rel="noreferrer"
      target="_blank"
      title="GitHub"
    >
      <Image
        alt=""
        aria-hidden="true"
        height={20}
        src="/github-mark.svg"
        unoptimized
        width={20}
      />
    </a>
  );
}
