import { useEffect, useState, Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getClusteringResults } from "@/services/insights";
import type { Topic, Subtopic } from "@/types/insights";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryDetailSheet } from "@/components/category-detail-sheet";

interface CategoriesTableProps {
  configId: string;
}

interface TopicWithSubtopics extends Topic {
  subtopics: Subtopic[];
}

export function CategoriesTable({ configId }: CategoriesTableProps) {
  const [topics, setTopics] = useState<TopicWithSubtopics[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch clustering results
        const clusteringResult = await getClusteringResults(configId);

        if (!clusteringResult || !clusteringResult.taxonomy) {
          setTopics([]);
          return;
        }

        // Extract topics and subtopics from clustering results
        const topicsData: TopicWithSubtopics[] = [];

        // Sort taxonomy keys numerically
        const sortedTopicIds = Object.keys(clusteringResult.taxonomy).sort((a, b) =>
          parseInt(a) - parseInt(b)
        );

        sortedTopicIds.forEach((topicId, topicIndex) => {
          const taxonomyData = clusteringResult.taxonomy[topicId];
          const conversationIds = clusteringResult.high_level_clusters[topicId] || [];
          const conversationCount = taxonomyData.member_count;
          const percentage = (conversationCount / clusteringResult.cluster_stats.total_conversations) * 100;

          // Create topic
          const topic: Topic = {
            id: topicId,
            key: topicId,
            configId,
            topicIndex,
            name: taxonomyData.category.name,
            description: taxonomyData.category.description,
            conversationCount,
            percentage,
            conversationIds,
            created_at: clusteringResult.created_at,
          };

          // Create subtopics
          const subtopics: Subtopic[] = [];
          const subclusterData = clusteringResult.subclusters[topicId] || {};
          const subclusterIds = Object.keys(subclusterData).sort((a, b) => parseInt(a) - parseInt(b));

          taxonomyData.subcategories.forEach((subcategoryData, subtopicIndex) => {
            // Match subtopic index to subcluster id
            const subclusterId = subclusterIds[subtopicIndex];
            const subtopicConvIds = subclusterId ? subclusterData[subclusterId] || [] : [];
            const subtopicConvCount = subtopicConvIds.length;
            const subtopicPercentage = (subtopicConvCount / clusteringResult.cluster_stats.total_conversations) * 100;

            subtopics.push({
              id: `${topicId}-${subclusterId || subtopicIndex}`,
              key: `${topicId}-${subclusterId || subtopicIndex}`,
              topicId,
              configId,
              topicIndex,
              subtopicIndex,
              name: subcategoryData.name,
              description: subcategoryData.description,
              conversationCount: subtopicConvCount,
              percentage: subtopicPercentage,
              conversationIds: subtopicConvIds,
              created_at: clusteringResult.created_at,
            });
          });

          topicsData.push({
            ...topic,
            subtopics,
          });
        });

        setTopics(topicsData);

        // Default all topics to expanded
        setExpandedTopics(new Set(topicsData.map(t => t.topicIndex)));
      } catch (err) {
        console.error("Failed to load clustering results:", err);
        setError("Failed to load topics");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [configId]);

  const toggleTopic = (topicIndex: number) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicIndex)) {
        next.delete(topicIndex);
      } else {
        next.add(topicIndex);
      }
      return next;
    });
  };

  const handleTopicClick = (topic: TopicWithSubtopics, e: React.MouseEvent) => {
    // Don't open sheet if clicking on the expand button area
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setSelectedTopic(topic);
    setSelectedSubtopic(null);
    setSheetOpen(true);
  };

  const handleSubtopicClick = (topic: TopicWithSubtopics, subtopic: Subtopic) => {
    setSelectedTopic(topic);
    setSelectedSubtopic(subtopic);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="border rounded-md overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (topics.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No topics found for this insight
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">Topics</h2>
        <span className="text-xs text-muted-foreground">
          {topics.length}
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="h-8 w-8"></th>
              <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">
                Name
              </th>
              <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground w-24">
                Convs
              </th>
              <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground w-20">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <Fragment key={`topic-${topic.id}`}>
                <tr
                  className="border-b last:border-0 hover:bg-accent/50 cursor-pointer"
                  onClick={(e) => handleTopicClick(topic, e)}
                >
                  <td className="h-10 px-2">
                    <button
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTopic(topic.topicIndex);
                      }}
                    >
                      {expandedTopics.has(topic.topicIndex) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="h-10 px-3 font-medium truncate">
                    {topic.name}
                  </td>
                  <td className="h-10 px-3 text-right tabular-nums text-muted-foreground">
                    {topic.conversationCount}
                  </td>
                  <td className="h-10 px-3 text-right tabular-nums text-muted-foreground text-xs">
                    {topic.percentage?.toFixed(0)}%
                  </td>
                </tr>

                {expandedTopics.has(topic.topicIndex) &&
                  topic.subtopics.map((subtopic) => (
                    <tr
                      key={`subtopic-${subtopic.id}`}
                      className="border-b last:border-0 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSubtopicClick(topic, subtopic)}
                    >
                      <td className="h-9"></td>
                      <td className="h-9 px-3 pl-10 text-muted-foreground truncate">
                        └ {subtopic.name}
                      </td>
                      <td className="h-9 px-3 text-right tabular-nums text-muted-foreground">
                        {subtopic.conversationCount}
                      </td>
                      <td className="h-9 px-3 text-right tabular-nums text-muted-foreground text-xs">
                        {subtopic.percentage?.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedTopic}
        subcategory={selectedSubtopic}
      />
    </div>
  );
}
